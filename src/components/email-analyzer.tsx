'use client';

import * as React from 'react';

import { EmailFileUpload } from '@/components/email-file-upload';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { usePhishingAnalysis } from '@/hooks/use-phishing-analysis';
import { ParsedEmailContent } from '@/lib/email-parser';
import { apiKeyStorage } from '@/lib/storage';
import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';

interface ModelSelectionConfig {
  provider: string;
  model: string;
  temperature: number;
}

interface EmailAnalyzerProps {
  modelConfig: ModelSelectionConfig | null;
}

export function EmailAnalyzer({ modelConfig }: EmailAnalyzerProps) {
  const [emailContent, setEmailContent] = React.useState('');
  const [parsedEmailData, setParsedEmailData] =
    React.useState<ParsedEmailContent | null>(null);
  const {
    analyzeEmail,
    resetAnalysis,
    retryAnalysis,
    isAnalyzing,
    isCompleted,
    hasError,
    result,
    error,
    progress,
  } = usePhishingAnalysis();

  // 需要從主頁面獲取 API 金鑰
  const [apiKey, setApiKey] = React.useState<string>('');

  const handleAnalyze = async () => {
    if (!emailContent.trim() || !modelConfig || !apiKey) return;

    toast.loading('開始分析郵件內容...', { id: 'analysis' });

    await analyzeEmail({
      emailContent,
      modelSettings: {
        provider: modelConfig.provider,
        model: modelConfig.model,
        temperature: modelConfig.temperature,
        apiKey: apiKey,
      },
    });
  };

  const handleRetry = () => {
    if (!modelConfig || !apiKey) return;

    retryAnalysis({
      emailContent,
      modelSettings: {
        provider: modelConfig.provider,
        model: modelConfig.model,
        temperature: modelConfig.temperature,
        apiKey: apiKey,
      },
    });
  };

  const getRiskBadgeVariant = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'high':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // 處理郵件文件上傳
  const handleEmailParsed = React.useCallback(
    (content: string, parsedData: ParsedEmailContent) => {
      setEmailContent(content);
      setParsedEmailData(parsedData);
    },
    []
  );

  // 暫時從 localStorage 獲取 API 金鑰（實際應該從父組件傳入）
  React.useEffect(() => {
    if (modelConfig?.provider) {
      const storedKey = apiKeyStorage.get(modelConfig.provider);
      if (storedKey) {
        setApiKey(storedKey);
      }
    }
  }, [modelConfig?.provider]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* 輸入區域 */}
      <Card className="glass-card glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            郵件內容分析
          </CardTitle>
          <CardDescription>
            貼上您想要分析的郵件內容，系統將使用 AI 模型進行釣魚郵件偵測。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 文件上傳區域 */}
          <div className="space-y-2">
            <Label>上傳郵件文件</Label>
            <EmailFileUpload
              onEmailParsed={handleEmailParsed}
              disabled={isAnalyzing}
            />
          </div>

          {/* 或者手動輸入 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                或手動輸入
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-content">郵件內容</Label>
            <Textarea
              id="email-content"
              placeholder="貼上完整的郵件內容（包含標題、發送者、內容）..."
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
              className="min-h-[300px] max-h-[500px] glass resize-none overflow-y-auto"
              disabled={isAnalyzing}
            />
          </div>

          {/* 顯示解析後的郵件資訊 */}
          {parsedEmailData && (
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg space-y-1">
              <p className="font-medium">已解析的郵件資訊：</p>
              <p>主題: {parsedEmailData.subject}</p>
              <p>發件人: {parsedEmailData.from}</p>
              <p>日期: {parsedEmailData.date}</p>
            </div>
          )}

          {/* 進度條 */}
          {isAnalyzing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>分析進度</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleAnalyze}
              disabled={
                !emailContent.trim() || !modelConfig || !apiKey || isAnalyzing
              }
              className="flex-1 glow-hover"
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  開始分析
                </>
              )}
            </Button>

            {(isCompleted || hasError) && (
              <Button
                onClick={resetAnalysis}
                variant="outline"
                size="lg"
                className="glass"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* 錯誤提示 */}
          {!modelConfig && (
            <div className="text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
              ⚠️ 請先選擇模型配置
            </div>
          )}

          {!apiKey && modelConfig && (
            <div className="text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
              ⚠️ 請先在設定中配置 {modelConfig.provider} 的 API 金鑰
            </div>
          )}
        </CardContent>
      </Card>

      {/* 結果區域 */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {result?.isPhishing ? (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            ) : result && !result.isPhishing ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <CheckCircle className="h-5 w-5 text-gray-400" />
            )}
            分析結果
          </CardTitle>
          <CardDescription>AI 模型對郵件內容的安全性評估</CardDescription>
        </CardHeader>
        <CardContent>
          {!result && !isAnalyzing && !hasError && (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              請輸入郵件內容並開始分析
            </div>
          )}

          {isAnalyzing && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p className="text-muted-foreground">AI 正在分析郵件內容...</p>
                <p className="text-sm text-muted-foreground">
                  進度: {progress}%
                </p>
              </div>
            </div>
          )}

          {hasError && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-4">
                <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
                <div>
                  <p className="text-red-600 dark:text-red-400 font-medium">
                    分析失敗
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{error}</p>
                </div>
                <Button onClick={handleRetry} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  重新分析
                </Button>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              {/* 總體評估 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">釣魚郵件判定</span>
                  <Badge
                    variant={result.isPhishing ? 'destructive' : 'default'}
                  >
                    {result.isPhishing ? '是釣魚郵件' : '非釣魚郵件'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold">信心分數</span>
                  <span className="text-2xl font-bold">
                    {result.confidenceScore}%
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold">風險等級</span>
                  <Badge variant={getRiskBadgeVariant(result.riskLevel)}>
                    {result.riskLevel === 'low' && '低風險'}
                    {result.riskLevel === 'medium' && '中等風險'}
                    {result.riskLevel === 'high' && '高風險'}
                  </Badge>
                </div>
              </div>

              {/* 可疑點 */}
              {result.suspiciousPoints.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold">可疑點分析</h4>
                  <ul className="space-y-2">
                    {result.suspiciousPoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-500 flex-shrink-0" />
                        <span className="text-sm">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 詳細說明 */}
              <div className="space-y-3">
                <h4 className="font-semibold">詳細說明</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {result.explanation}
                </p>
              </div>

              {/* 分析資訊 */}
              <div className="text-xs text-muted-foreground border-t pt-3 space-y-1">
                <div>
                  分析時間: {new Date(result.timestamp).toLocaleString('zh-TW')}
                </div>
                {modelConfig && (
                  <div>
                    使用模型: {modelConfig.provider} - {modelConfig.model}{' '}
                    (溫度: {modelConfig.temperature})
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
