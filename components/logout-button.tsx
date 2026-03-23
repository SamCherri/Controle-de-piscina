'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
      onClick={() =>
        startTransition(async () => {
          try {
            await fetch('/api/auth/logout', {
              method: 'POST',
              headers: { 'Cache-Control': 'no-store' },
              credentials: 'include'
            });
          } finally {
            router.replace('/login');
            router.refresh();
          }
        })
      }
      disabled={pending}
    >
      {pending ? 'Saindo...' : 'Sair'}
    </button>
  );
}
