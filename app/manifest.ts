import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Controle de Piscina',
    short_name: 'Piscina',
    description: 'Gestão operacional de piscinas para condomínios.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#0c78b2',
    icons: [
      {
        src: '/icons/icon-192.svg',
        sizes: 'any',
        type: 'image/svg+xml'
      },
      {
        src: '/icons/icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml'
      }
    ]
  };
}
