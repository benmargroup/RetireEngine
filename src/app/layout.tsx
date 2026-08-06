import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Lifetime SS — Social Security Claiming Calculator',
    template: '%s | Lifetime SS',
  },
  description:
    'Personalized Social Security claiming age and geo-arbitrage calculator: longevity-adjusted break-even, visa income math, and Medicare strategy.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
