import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Simplify IVA CR',
    short_name: 'Simplify IVA',
    description: 'Cálculo mensual de IVA para profesionales independientes en Costa Rica',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8f9fc',
    theme_color: '#D97706',
    lang: 'es-CR',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
