import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "21M Internal Market Terminal",
  description: "Private internal market monitoring terminal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
