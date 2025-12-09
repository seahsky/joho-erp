import type { Metadata } from 'next'
import { Cormorant_Garamond, DM_Sans, Bebas_Neue, Space_Mono, Fraunces, Nunito } from 'next/font/google'
import './globals.css'

// Design 1: Editorial Luxury fonts
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
})

// Design 2: Modern Industrial fonts
const bebas = Bebas_Neue({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-bebas',
  display: 'swap',
})

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
  display: 'swap',
})

// Design 3: Natural Organic fonts
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-fraunces',
  display: 'swap',
})

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-nunito',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Jimmy Beef | Premium Meat Supplier',
  description: 'Your trusted partner for premium beef, pork, and chicken. Supplying quality meats to businesses worldwide.',
  keywords: ['meat supplier', 'beef', 'pork', 'chicken', 'B2B', 'wholesale meat', 'premium meat'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`
        ${cormorant.variable}
        ${dmSans.variable}
        ${bebas.variable}
        ${spaceMono.variable}
        ${fraunces.variable}
        ${nunito.variable}
      `}
    >
      <body>{children}</body>
    </html>
  )
}
