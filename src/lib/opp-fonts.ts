import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';

// Fonts used by the opportunity-tracker workspace (Deals, Vendors), matching the
// artifact it was merged from. Applied via the `opp` wrapper class in opp.css.
export const plexSans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--opp-sans' });
export const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--opp-mono' });

export const oppFontClasses = `${plexSans.variable} ${plexMono.variable}`;
