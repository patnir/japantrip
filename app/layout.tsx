import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Carolyn and Rahul Go To Japan",
  description: "Our Japan trip planning - places to visit, eat, and stay",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: "Carolyn and Rahul Go To Japan",
    description: "Our Japan trip planning - places to visit, eat, and stay",
    images: [
      {
        url: "/hero.png",
        width: 1200,
        height: 630,
        alt: "Carolyn and Rahul Go To Japan",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Carolyn and Rahul Go To Japan",
    description: "Our Japan trip planning - places to visit, eat, and stay",
    images: ["/hero.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
