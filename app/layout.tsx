import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Duetto RMS ROI Calculator",
  description: "Professional ROI analysis for Duetto Revenue Management Software — built for hotel operators and asset managers.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📊</text></svg>",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400&family=DM+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen" style={{ background: "linear-gradient(135deg, #050D1A 0%, #0A1628 50%, #0F2040 100%)" }}>
        {children}
      </body>
    </html>
  );
}
