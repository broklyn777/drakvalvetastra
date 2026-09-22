import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Drakvalvet — Gråskogens krönikor',
  description:
    'Ett berättelsedrivet fantasyrollspel. Skapa din hjälte, upptäck Gråskogen och spela solo eller med ditt sällskap.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  );
}
