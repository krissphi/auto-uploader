import { Platform } from "../../types";

export const YoutubeIcon = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
    <path d="M21.582,6.186c-0.23-0.86-0.908-1.538-1.768-1.768C18.254,4,12,4,12,4S5.746,4,4.186,4.418c-0.86,0.23-1.538,0.908-1.768,1.768 C2,7.746,2,12,2,12s0,4.254,0.418,5.814c0.23,0.86,0.908,1.538,1.768,1.768C5.746,20,12,20,12,20s6.254,0,7.814-0.418 c0.86-0.23,1.538-0.908,1.768-1.768C22,16.254,22,12,22,12S22,7.746,21.582,6.186z M10,15.464V8.536L16,12L10,15.464z"/>
  </svg>
);

export const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

export const TiktokIcon = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.24-2.89 1.34-5.69 3.94-7.05 1.5-.78 3.27-1.02 4.96-.86v4.06c-1.15-.07-2.35.13-3.35.79-1.09.7-1.8 1.99-1.87 3.32-.08 1.48.73 2.93 1.98 3.73 1.05.67 2.4.88 3.6.53 1.3-.39 2.37-1.37 2.87-2.61.27-.68.39-1.42.41-2.16V0h3.63z" />
  </svg>
);

export const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
  </svg>
);

export const MetaBusinessIcon = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />
    <path d="M9 12v-2c0-.55.45-1 1-1h4c.55 0 1 .45 1 1v4c0 .55-.45 1-1 1h-2v2" />
    <circle cx="12" cy="18" r="0.5" fill="currentColor" />
  </svg>
);

export const PLATFORMS: Platform[] = [
  { id: 'youtube', name: 'YouTube Shorts', icon: <YoutubeIcon /> },
  { id: 'tiktok', name: 'TikTok', icon: <TiktokIcon /> },
  { id: 'meta_business', name: 'Meta Business Suite', icon: <MetaBusinessIcon /> },
];
