import { MetadataRoute } from 'next';

/**
 * 動態生成 manifest.json (PWA 支援)
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LLM 釣魚郵件偵測器',
    short_name: '釣魚郵件偵測器',
    description: '使用語言模型偵測釣魚郵件的智能工具',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#3b82f6',
    orientation: 'portrait',
    scope: '/',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['security', 'productivity', 'utilities'],
    lang: 'zh-TW',
    dir: 'ltr',
  };
}
