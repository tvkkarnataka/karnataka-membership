import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TVK Karnataka Membership Drive',
  description: 'Official registration portal for TVK Karnataka organization.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}