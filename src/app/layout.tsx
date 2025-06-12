import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // 優化字體載入
});

export const metadata: Metadata = {
  title: 'LLM 釣魚郵件偵測器',
  description: '使用語言模型偵測釣魚郵件的智能工具',
  keywords: ['釣魚郵件', '郵件安全', 'AI 偵測', '網路安全', 'LLM'],
  authors: [{ name: 'LLM Phishing Detector Team' }],
  creator: 'LLM Phishing Detector',
  publisher: 'LLM Phishing Detector',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://llm-phish-detector.vercel.app'), // 替換為實際域名
  openGraph: {
    title: 'LLM 釣魚郵件偵測器',
    description: '使用語言模型偵測釣魚郵件的智能工具',
    type: 'website',
    locale: 'zh_TW',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LLM 釣魚郵件偵測器',
    description: '使用語言模型偵測釣魚郵件的智能工具',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <head>
        {/* 預載入關鍵資源 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />

        {/* 安全標頭 */}
        <meta name="referrer" content="origin-when-cross-origin" />

        {/* 視窗設定 */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5"
        />

        {/* 主題色彩 */}
        <meta name="theme-color" content="#3b82f6" />
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
