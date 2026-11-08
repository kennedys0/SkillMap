import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import { ThemeRegistry } from "./theme-registry";

export const metadata: Metadata = {
  title: "MOCHI SkillMap",
  description: "A private, local catalog of installed agent skills.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
