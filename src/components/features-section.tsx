import { Card, CardContent } from '@/components/ui/card';
import { Globe, Shield, Zap } from 'lucide-react';

/**
 * 功能特色展示組件 - 純靜態內容，可以 SSR
 */
export function FeaturesSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
      <Card className="glass-card glow-hover text-center p-6">
        <CardContent className="pt-0">
          <div className="gradient-brand h-12 w-12 rounded-lg mx-auto mb-4 flex items-center justify-center glow animate-float">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <h3 className="font-semibold text-lg mb-2">智慧分析</h3>
          <p className="text-sm text-muted-foreground">
            採用最新的AI技術深度分析郵件內容，識別各種釣魚手法
          </p>
        </CardContent>
      </Card>

      <Card className="glass-card glow-hover text-center p-6">
        <CardContent className="pt-0">
          <div className="gradient-success h-12 w-12 rounded-lg mx-auto mb-4 flex items-center justify-center glow-success animate-float">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h3 className="font-semibold text-lg mb-2">快速檢測</h3>
          <p className="text-sm text-muted-foreground">
            幾秒鐘內完成分析，即時提供詳細的風險評估報告
          </p>
        </CardContent>
      </Card>

      <Card className="glass-card glow-hover text-center p-6">
        <CardContent className="pt-0">
          <div className="gradient-warning h-12 w-12 rounded-lg mx-auto mb-4 flex items-center justify-center glow-warning animate-float">
            <Globe className="h-6 w-6 text-white" />
          </div>
          <h3 className="font-semibold text-lg mb-2">隱私保護</h3>
          <p className="text-sm text-muted-foreground">
            API 金鑰僅在您的瀏覽器本地儲存，不會上傳至任何伺服器
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
