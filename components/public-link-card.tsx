'use client';

import { useState } from 'react';

type PublicLinkCardProps = {
  publicUrl: string;
  warning?: string;
};

export function PublicLinkCard({ publicUrl, warning }: PublicLinkCardProps) {
  const [copyFeedback, setCopyFeedback] = useState<'idle' | 'copied' | 'error'>('idle');

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopyFeedback('copied');
      window.setTimeout(() => setCopyFeedback('idle'), 2500);
    } catch {
      setCopyFeedback('error');
      window.setTimeout(() => setCopyFeedback('idle'), 2500);
    }
  }

  async function handleShare() {
    if (typeof navigator === 'undefined' || !navigator.share) {
      await handleCopy();
      return;
    }

    try {
      await navigator.share({
        title: 'Página pública da piscina',
        text: 'Acompanhe a última medição da piscina neste link.',
        url: publicUrl
      });
    } catch {
      // Ignora cancelamentos do usuário.
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-900">Link público da piscina</p>
        <p className="break-all text-xs text-slate-500">{publicUrl}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={handleShare} className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white">Compartilhar link</button>
        <button type="button" onClick={handleCopy} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Copiar link</button>
        <a href={publicUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Abrir em nova guia</a>
      </div>
      {copyFeedback === 'copied' ? <p className="text-xs text-emerald-700">Link copiado.</p> : null}
      {copyFeedback === 'error' ? <p className="text-xs text-amber-700">Não foi possível copiar automaticamente neste navegador.</p> : null}
      {warning ? <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">{warning}</p> : null}
      <p className="text-xs leading-5 text-slate-500">Como apps de mercado fazem: usam uma URL pública canônica no QR code e mantêm a foto no backend para que qualquer celular abra o mesmo conteúdo, sem depender do aparelho que registrou a medição.</p>
    </div>
  );
}
