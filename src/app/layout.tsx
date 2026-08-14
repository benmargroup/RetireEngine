import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://retireengine.com'),
  title: {
    default: 'RetireEngine | Personalized Social Security & Relocation Engine',
    template: '%s | RetireEngine',
  },
  description:
    'Calculate your optimal Social Security claiming age, model portfolio solvency, and match 10 global retirement destinations by cost, visa rules, and climate.',
  keywords: [
    'Social Security claiming strategy',
    'Retire abroad calculator',
    'Retirement visa income rules',
    'Expat retirement destinations',
    'Retirement solvency engine',
  ],
  authors: [{ name: 'RetireEngine' }],
  openGraph: {
    title: 'RetireEngine — Where Should You Retire & When Should You Claim?',
    description:
      'Model your Social Security claiming strategy, passport residency rights, and budget fit across top global retirement hubs in 4 minutes.',
    url: 'https://retireengine.com',
    siteName: 'RetireEngine',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RetireEngine | Personalized Social Security & Relocation Engine',
    description:
      'Model your Social Security claiming strategy and match global retirement hubs in 4 minutes.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
