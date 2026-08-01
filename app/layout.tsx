import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PDF Breeze｜免費 PDF 合併、擷取與旋轉工具",
  description: "檔案不上傳，在瀏覽器中快速合併、擷取與旋轉 PDF。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "PDF Breeze｜整理 PDF，不用繞遠路",
    description: "合併、擷取、旋轉；檔案只在你的瀏覽器中處理。",
    images: [{ url: "/og.png", width: 1734, height: 907, alt: "PDF Breeze PDF 線上工具" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
