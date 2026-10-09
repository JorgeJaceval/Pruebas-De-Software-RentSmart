import { useState } from 'react';

export default function SpacePhoto({ url, label }: { url: string | null; label: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className="space-photo">
      {failed || !url ? <div className="photo-fallback" role="img" aria-label={`${label}: foto no disponible`}>
        <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 9h38v30H5zM5 32l12-12 10 10 7-7 9 9" /><circle cx="33" cy="17" r="3" /></svg>
        <span>Foto no disponible</span>
      </div> : <img src={url} alt={label} referrerPolicy="no-referrer" onError={() => setFailed(true)} />}
    </figure>
  );
}
