import type { Metadata } from "next";
import "./globals.css";

// 设置软件的浏览器标签页标题和元数据
export const metadata: Metadata = {
  title: "YuE Music Studio - AI 全自动写歌控制台",
  description: "基于字节跳动 YuE 开源音乐大模型的新一代全自动词曲编排与人声生成工作台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="antialiased min-h-screen bg-zinc-950 text-zinc-50">
        {children}
      </body>
    </html>
  );
}