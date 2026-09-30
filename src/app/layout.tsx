import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CCA-F Practice · PiHive",
    template: "%s · PiHive",
  },
  description:
    "PiHive practice for CCA-F. Latest bank or the older GitHub cca-prep dump, with an explanation after every answer.",
};

export const viewport: Viewport = {
  themeColor: "#f4f0e6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#content">
          Skip to content
        </a>
        <Header />
        <main id="content">{children}</main>
      </body>
    </html>
  );
}
