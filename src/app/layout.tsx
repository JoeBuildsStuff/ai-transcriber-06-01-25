import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

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
    <body className="font-sans antialiased">
      <Providers>
        {children}
      </Providers>
    </body>
  </html>
);
}
