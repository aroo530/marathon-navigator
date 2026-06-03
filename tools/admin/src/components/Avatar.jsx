export default function Avatar({ url, name = '', size = 40, circle = true }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const style = { width: size, height: size, fontSize: size * 0.38, flexShrink: 0 };

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="avatar"
        style={{ ...style, borderRadius: circle ? '50%' : 8, objectFit: 'cover' }}
        onError={e => { e.currentTarget.style.display = 'none'; }}
      />
    );
  }

  return (
    <div
      className="avatar"
      style={{ ...style, borderRadius: circle ? '50%' : 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {initial}
    </div>
  );
}
