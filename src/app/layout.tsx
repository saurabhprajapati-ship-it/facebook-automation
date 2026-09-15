import './globals.css';
import type { Metadata } from 'next';
import Sidebar from '@/components/Sidebar';

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
      <body className="bg-cream-100 text-stone-900 min-h-screen flex overflow-x-hidden">
        <Sidebar />
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
