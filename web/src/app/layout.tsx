import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppWrapper from "@/components/AppWrapper";

export const metadata: Metadata = {
  title: "FootCheck — Diabetic Foot Screening",
  description: "Mobile-first multilingual diabetic foot screening assistant for care navigation",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#0f766e",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppWrapper>{children}</AppWrapper>
      </body>
    </html>
  );
}
