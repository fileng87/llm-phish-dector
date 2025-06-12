/**
 * 頁面介紹組件 - 純靜態內容，可以 SSR
 */
export function HeroSection() {
  return (
    <div className="text-center space-y-4">
      <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        智慧釣魚郵件偵測器
      </h2>
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
        運用先進的語言模型技術，快速識別可疑郵件內容，保護您的數位安全
      </p>
    </div>
  );
}
