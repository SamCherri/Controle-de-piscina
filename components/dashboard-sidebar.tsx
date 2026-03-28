'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Home, Users, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/condominios/novo', label: 'Novo condomínio', icon: Building2 },
  { href: '/usuarios', label: 'Usuários', icon: Users },
  { href: '/debug/fotos', label: 'Diagnóstico', icon: Wrench }
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-72 border-r border-slate-200 bg-white/95 p-6 lg:block">
      <div className="rounded-2xl bg-gradient-to-br from-brand-900 to-brand-700 p-4 text-white">
        <p className="text-xs uppercase tracking-[0.2em] text-brand-100">Controle de piscina</p>
        <p className="mt-2 text-lg font-semibold">Painel operacional</p>
      </div>

      <nav className="mt-6 space-y-1">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
                isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
