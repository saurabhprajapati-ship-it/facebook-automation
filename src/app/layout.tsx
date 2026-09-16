import './globals.css';
import type { Metadata } from 'next';
import AppShell from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'PostNova - Facebook Automation & Bulk Scheduler',
  description: 'Automate your Facebook Pages with PostNova: Gemini AI captions, 5TB Google Drive bulk scheduling, smart watermark removal, and custom branding.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-cream-100 dark:bg-[#0d0f12] text-stone-900 dark:text-stone-100 min-h-screen transition-colors duration-200">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
