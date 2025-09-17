import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Next Steps",
  description: "AI Next Steps",
};

export default function RootLayout({
children,
}: Readonly<{
children: React.ReactNode;
}>) {
return (
  <html lang="en" suppressHydrationWarning>
    <body className={inter.className + ""}>
      <Providers>
        {children}
      </Providers>
    </body>
  </html>
);
}