import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Freedom — Financial Life Planner",
  description:
    "Track spending, plan budgets, grow investments, crush debt and reach your financial goals.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&f[]=satoshi@400,500,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
