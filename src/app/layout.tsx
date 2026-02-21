import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SolarScan — AI Drone Solar Inspection',
  description: 'Upload drone thermal/RGB imagery, detect defects with AI, generate professional inspection reports.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0F0F0F] text-[#F5F5F5] antialiased">{children}</body>
    </html>
  );
}
