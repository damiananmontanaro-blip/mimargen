import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MiMargen — Conocé el margen real de tu negocio',
  description:
    'El analizador de márgenes, precios y caja para PyMEs de Argentina, México y Colombia. Margen real, precio correcto, simulador, flujo y forecast. 3 días gratis.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
