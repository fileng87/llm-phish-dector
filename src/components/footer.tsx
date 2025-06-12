/**
 * 頁腳組件 - 純靜態內容，可以 SSR
 */
export function Footer() {
  return (
    <footer className="w-full border-t glass backdrop-blur-sm mt-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center text-sm text-muted-foreground">
          <p>© 2025 LLM 釣魚郵件偵測器. 使用先進的 AI 技術保護您的數位安全.</p>
        </div>
      </div>
    </footer>
  );
}
