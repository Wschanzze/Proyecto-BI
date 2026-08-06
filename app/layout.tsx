import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Monarca Analytics BI — Cuadro de Resultados',
  description:
    'Panel de control de datos de Supermercados Monarca. Carga, visualiza y analiza el cuadro de resultados mensual.',
  generator: 'v0.app',
  icons: {
    icon: '/supermercados_monarca_logo-removebg-preview__2_-1777696368463.ico',
    apple: '/supermercados_monarca_logo-removebg-preview__2_-1777696368463.ico',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#0b4da2',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es-AR" className={`light ${inter.variable} bg-background`}>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
