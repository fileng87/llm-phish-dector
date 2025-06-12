import { ClientApp } from '@/components/client-app';
import { FeaturesSection } from '@/components/features-section';
import { Footer } from '@/components/footer';
import { Header } from '@/components/header';

/**
 * 主頁面 - 使用 SSR + 客戶端混合模式
 * 靜態內容在服務器端渲染，動態內容在客戶端渲染
 */
export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />

      {/* 客戶端應用容器 - 包含 Header、介紹區域和主要功能 */}
      <ClientApp />

      {/* 靜態內容區域 - 服務器端渲染 */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* 功能特色 - SSR */}
        <FeaturesSection />
      </div>

      {/* 頁腳 - SSR */}
      <Footer />
    </div>
  );
}
