import { readFileSync } from 'fs';

const QWEN_API_URL = 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

/**
 * @param {string[]} images  - Local file paths, HTTP(S) URLs, or data URIs
 * @param {string}   prompt  - Edit instruction
 * @param {string}   apiKey  - QWEN_API_KEY
 * @param {object}   opts    - { model, aspectRatio }
 * @returns {Promise<Buffer>} - PNG/JPEG buffer of the result image
 */
export async function qwenEditImage(images, prompt, apiKey, opts = {}) {
  const { model = 'qwen-image-2.0-pro', aspectRatio } = opts;

  const contentArray = [];
  for (const img of images) {
    let b64, mime;
    if (img.startsWith('data:')) {
      const [header, data] = img.split(',');
      mime = header.match(/data:([^;]+)/)[1];
      b64 = data;
    } else if (img.startsWith('http://') || img.startsWith('https://')) {
      const resp = await fetch(img);
      const buf = await resp.arrayBuffer();
      b64 = Buffer.from(buf).toString('base64');
      mime = (resp.headers.get('content-type') || 'image/jpeg').split(';')[0];
    } else {
      b64 = readFileSync(img).toString('base64');
      mime = img.endsWith('.png') ? 'image/png' : 'image/jpeg';
    }
    contentArray.push({ image: `data:${mime};base64,${b64}` });
  }
  contentArray.push({ text: prompt });

  const parameters = {
    negative_prompt: 'noise, artifacts, grain, blur, distortion, low quality, deformed',
    prompt_extend: true,
    seed: 42,
  };
  if (aspectRatio === '1:1')   parameters.size = '1024*1024';
  else if (aspectRatio === '16:9') parameters.size = '1280*720';
  else if (aspectRatio === '9:16') parameters.size = '720*1280';
  else if (aspectRatio === '4:3')  parameters.size = '1024*768';
  else if (aspectRatio === '3:2')  parameters.size = '1152*768';

  const callQwen = (m, content) => fetch(QWEN_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: m,
      input: { messages: [{ role: 'user', content }] },
      parameters,
    }),
  });

  let currentModel = model;
  let res = await callQwen(currentModel, contentArray);
  let data = await res.json();

  if (!res.ok) {
    const msg = data.message || data.error || '';
    const isRateLimit = /rate-limit|Requests rate limit exceeded|Throttling/i.test(msg);
    if (isRateLimit || /inappropriate-content/i.test(msg)) {
      if (isRateLimit) {
        currentModel = currentModel === 'qwen-image-2.0-pro' ? 'qwen-image-2.0' : 'qwen-image-2.0-pro';
      }
      await new Promise(r => setTimeout(r, 1000));
      res = await callQwen(currentModel, contentArray);
      data = await res.json();
    }
    if (!res.ok) {
      const msg2 = data.message || data.error || '';
      if (/rate-limit|Requests rate limit exceeded|Throttling/i.test(msg2)) {
        currentModel = 'z-image-turbo';
        await new Promise(r => setTimeout(r, 1000));
        res = await callQwen(currentModel, [{ text: prompt.substring(0, 400) }]);
        data = await res.json();
      }
      if (!res.ok) throw new Error(`Qwen API error: ${data.message || data.error || `HTTP ${res.status}`}`);
    }
  }

  const resultUrl = data.output.choices[0].message.content.find(c => c.image)?.image;
  if (!resultUrl) throw new Error('No image in Qwen response');

  const imgBuf = await fetch(resultUrl).then(r => r.arrayBuffer());
  return Buffer.from(imgBuf);
}
