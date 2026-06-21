import { useState, type RefObject } from 'react';
import { downloadPng, downloadPdf, exportFilename } from '../lib/export';

interface Props {
  targetRef: RefObject<HTMLDivElement>;
  name: string;
  surname: string;
}

export default function ExportButtons({ targetRef, name, surname }: Props) {
  const [busy, setBusy] = useState<null | 'png' | 'pdf'>(null);

  async function run(kind: 'png' | 'pdf') {
    if (!targetRef.current || busy) return;
    setBusy(kind);
    try {
      const filename = exportFilename(name, surname);
      if (kind === 'png') await downloadPng(targetRef.current, filename);
      else await downloadPdf(targetRef.current, filename);
    } catch (err) {
      console.error('Export failed', err);
      alert('Maaf, ekspor gagal. Coba lagi. / Export failed, please try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <button
        className="btn btn--ghost btn--icon"
        onClick={() => run('png')}
        disabled={busy !== null}
        title="Unduh PNG · Download PNG"
        aria-label="Unduh PNG · Download PNG"
      >
        {busy === 'png' ? '…' : '🖼'}
      </button>
      <button
        className="btn btn--ghost btn--icon"
        onClick={() => run('pdf')}
        disabled={busy !== null}
        title="Unduh PDF · Download PDF"
        aria-label="Unduh PDF · Download PDF"
      >
        {busy === 'pdf' ? '…' : '📄'}
      </button>
    </>
  );
}
