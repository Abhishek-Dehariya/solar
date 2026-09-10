import { Inter, Space_Grotesk, IBM_Plex_Mono } from 'next/font/google';
import '../styles/globals.css';
import { ThemeProvider } from '../lib/theme';

// Self-hosted fonts via next/font (no runtime CDN dependency).
const fontSpace = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space',
  display: 'swap',
});
const fontPlex = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex',
  display: 'swap',
});
const fontInter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export default function App({ Component, pageProps }) {
  return (
    <ThemeProvider>
      <div
        className={`${fontSpace.variable} ${fontPlex.variable} ${fontInter.variable} bg-bg font-sans text-ink`}
      >
        <Component {...pageProps} />
      </div>
    </ThemeProvider>
  );
}
