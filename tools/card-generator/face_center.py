"""
Detect the primary face in an image and return its centre as fractional coords.
Uses OpenCV Haar cascades (bundled with opencv-contrib-python — no extra download).

Install:
    pip install opencv-contrib-python

Usage:
    python face_center.py --image /path/to/image.jpg

Output (JSON to stdout):
    {"found": true,  "cx": 0.45, "cy": 0.30}
    {"found": false}
"""

import sys
import json
import argparse
from pathlib import Path


def detect(image_path: Path) -> dict:
    try:
        import cv2
    except ImportError:
        return {"found": False, "error": "opencv not installed — run: pip install opencv-contrib-python"}

    img = cv2.imread(str(image_path))
    if img is None:
        return {"found": False, "error": "could not read image"}

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape

    # Try frontal cascade first, fall back to profile if nothing found
    cascades = [
        cv2.data.haarcascades + "haarcascade_frontalface_alt2.xml",
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml",
        cv2.data.haarcascades + "haarcascade_profileface.xml",
    ]

    faces = []
    for cascade_path in cascades:
        cascade = cv2.CascadeClassifier(cascade_path)
        detected = cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=4,
            minSize=(max(20, w // 20), max(20, h // 20)),
        )
        if len(detected):
            faces = detected
            break

    if not len(faces):
        return {"found": False}

    # Pick the largest face (most prominent in frame)
    x, y, fw, fh = max(faces, key=lambda f: f[2] * f[3])

    cx = round((x + fw / 2) / w, 4)
    cy = round((y + fh / 2) / h, 4)

    return {"found": True, "cx": cx, "cy": cy}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True)
    args = parser.parse_args()

    path = Path(args.image).expanduser().resolve()
    if not path.exists():
        print(json.dumps({"found": False, "error": "file not found"}))
        sys.exit(0)

    print(json.dumps(detect(path)))
