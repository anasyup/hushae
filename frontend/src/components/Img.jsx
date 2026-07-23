import { useState } from 'react';

const FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1125"><rect width="100%" height="100%" fill="#E6DCD2"/><text x="50%" y="50%" fill="#69625F" font-family="Georgia,serif" font-size="34" letter-spacing="12" text-anchor="middle">VÉLOURA</text></svg>`
  );

export default function Img({ src, alt = '', className = '', ...rest }) {
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState(false);
  return (
    <img
      src={err ? FALLBACK : src}
      alt={alt}
      loading="lazy"
      onLoad={() => setLoaded(true)}
      onError={() => setErr(true)}
      className={`${className} transition-[opacity,filter] duration-700 ${loaded ? 'opacity-100 blur-0' : 'opacity-0 blur-md'}`}
      {...rest}
    />
  );
}
