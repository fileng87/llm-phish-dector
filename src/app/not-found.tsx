import { Button } from '@/components/ui/button';
import { Home, Search } from 'lucide-react';
import Link from 'next/link';

/**
 * 404 頁面組件 - SSR
 * 當頁面不存在時顯示
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md mx-auto px-4">
        <div className="h-16 w-16 bg-blue-500/10 rounded-lg mx-auto flex items-center justify-center">
          <Search className="h-8 w-8 text-blue-500" />
        </div>

        <div>
          <h1 className="text-6xl font-bold text-muted-foreground mb-2">404</h1>
          <h2 className="text-2xl font-bold mb-2">頁面不存在</h2>
          <p className="text-muted-foreground">
            很抱歉，您要尋找的頁面不存在或已被移除。
          </p>
        </div>

        <div className="space-y-3">
          <Button asChild className="w-full" size="lg">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              返回首頁
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
