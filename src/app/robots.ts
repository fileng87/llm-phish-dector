import { MetadataRoute } from 'next';

/**
 * 動態生成 robots.txt
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://llm-phish-detector.vercel.app'; // 替換為實際域名

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/'], // 禁止爬取的路徑
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
