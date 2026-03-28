'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LABELS: Record<string, string> = {
  condominios: 'Condomínios',
  piscinas: 'Piscinas',
  medicoes: 'Medições',
  usuarios: 'Usuários',
  novo: 'Novo',
  nova: 'Nova',
  editar: 'Editar',
  senha: 'Senha',
  debug: 'Debug',
  fotos: 'Fotos'
};

function isTechnicalSegment(segment: string) {
  const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(segment);
  const looksLikeCuid = /^c[a-z0-9]{8,}$/i.test(segment);
  const looksLikeOpaqueToken = /^[a-z0-9_-]{14,}$/i.test(segment) && !(segment in LABELS);

  return looksLikeUuid || looksLikeCuid || looksLikeOpaqueToken;
}

function toLabel(segment: string) {
  return LABELS[segment] ?? decodeURIComponent(segment);
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const visibleSegments = segments
    .map((segment, index) => ({ segment, index }))
    .filter(item => !isTechnicalSegment(item.segment));

  return (
    <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link href="/" className="hover:text-slate-800">Dashboard</Link>
        </li>
        {visibleSegments.map((item, index) => {
          const href = `/${segments.slice(0, item.index + 1).join('/')}`;
          const isLast = index === visibleSegments.length - 1;

          return (
            <li key={`${item.segment}-${index}`} className="flex items-center gap-2">
              <span>/</span>
              {isLast ? (
                <span className="font-medium text-slate-700">{toLabel(item.segment)}</span>
              ) : (
                <Link href={href} className="hover:text-slate-800">{toLabel(item.segment)}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
