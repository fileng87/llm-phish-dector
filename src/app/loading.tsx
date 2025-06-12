import { Loader2 } from 'lucide-react';

/**
 * 載入頁面組件 - SSR
 * 在頁面載入時顯示
 */
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="h-12 w-12 gradient-brand rounded-lg mx-auto flex items-center justify-center glow">
          <Loader2 className="h-6 w-6 text-white animate-spin" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">載入中...</h2>
          <p className="text-sm text-muted-foreground mt-1">
            正在初始化釣魚郵件偵測器
          </p>
        </div>
      </div>
    </div>
  );
}
