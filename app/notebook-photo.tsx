import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import { readPhoto } from '@/lib/browser-storage';

export default function NotebookPhoto({ photoId, alt, ...props }: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { photoId: string }) {
  const [source, setSource] = useState('');
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let active = true, url = '';
    setSource(''); setMissing(false);
    void readPhoto(photoId).then(blob => {
      if (!active) return;
      url = URL.createObjectURL(blob); setSource(url);
    }).catch(() => { if (active) setMissing(true); });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [photoId]);
  if (!source) return <span className="local-photo-placeholder" role="img" aria-label={alt}>{missing ? 'Photo unavailable in this browser' : 'Opening photo…'}</span>;
  return <img {...props} src={source} alt={alt || 'Batch photo'} />;
}
