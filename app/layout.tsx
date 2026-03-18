import type { Metadata } from 'next';
import './globals.css';
import { PwaRegister } from '@/components/pwa-register';

export const metadata: Metadata = {
  title: 'Controle de Piscina',
  description: 'Plataforma profissional para controle operacional de piscinas em condomínios.',
  manifest: '/manifest.webmanifest',
  themeColor: '#0c78b2',
  icons: {
    apple: '/icons/icon-192.svg',
    icon: ['/icons/icon-192.svg', '/icons/icon-512.svg']
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
