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

function labelSegment(segment: string) {
  return LABELS[segment] ?? decodeURIComponent(segment);
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link href="/" className="hover:text-slate-800">Dashboard</Link>
        </li>
        {segments.map((segment, index) => {
          const href = `/${segments.slice(0, index + 1).join('/')}`;
          const isLast = index === segments.length - 1;

          return (
            <li key={href} className="flex items-center gap-2">
              <span>/</span>
              {isLast ? (
                <span className="font-medium text-slate-700">{labelSegment(segment)}</span>
              ) : (
                <Link href={href} className="hover:text-slate-800">{labelSegment(segment)}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
