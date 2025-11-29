import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Open Hands App",
  description: "App para la Fundación Open Hands",
};

import { AuthProvider } from "@/context/AuthContext";
import { FocusRefresher } from "@/components/FocusRefresher";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <AuthProvider>
          <FocusRefresher />
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
