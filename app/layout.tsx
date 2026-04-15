import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Security Lab — Agentic AI Red Team Platform",
  description:
    "Practice real-world agentic AI security scenarios. 10 labs based on actual incidents: prompt injection, supply chain attacks, agent hijacking, and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-bg-primary text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
