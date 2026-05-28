import type { Metadata } from 'next';
import './../styles/globals.css';
import { Toaster } from 'sonner';
import { QueryProvider } from '@/components/query-provider';

export const metadata: Metadata = {
  title: 'Annex Workforce — Trusted talent infrastructure for Africa',
  description:
    'Hire, manage, and pay verified African talent globally. Verified marketplace, EOR, and HRMS in one platform.',
  keywords: ['African talent', 'EOR Africa', 'Nigerian payroll', 'remote hiring Africa'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          {children}
          <Toaster position="top-right" toastOptions={{ style: { fontFamily: 'inherit' } }} />
        </QueryProvider>
      </body>
    </html>
  );
}
