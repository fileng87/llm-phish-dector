'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * 錯誤頁面組件
 * 當應用發生錯誤時顯示
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 記錄錯誤到控制台
    console.error('應用錯誤:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md mx-auto px-4">
        <div className="h-16 w-16 bg-red-500/10 rounded-lg mx-auto flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">發生錯誤</h2>
          <p className="text-muted-foreground">
            很抱歉，應用遇到了一個問題。請嘗試重新載入頁面。
          </p>
        </div>

        <div className="space-y-3">
          <Button onClick={reset} className="w-full" size="lg">
            <RefreshCw className="mr-2 h-4 w-4" />
            重新載入
          </Button>

          <Button
            variant="outline"
            onClick={() => (window.location.href = '/')}
            className="w-full"
          >
            返回首頁
          </Button>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <details className="text-left mt-6">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              錯誤詳情 (開發模式)
            </summary>
            <pre className="mt-2 text-xs bg-muted p-3 rounded overflow-auto">
              {error.message}
              {error.stack && '\n\n' + error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
