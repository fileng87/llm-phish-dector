'use client';

import * as React from 'react';
import ReactMarkdown from 'react-markdown';

import { ParsedEmailContent, parseEmailFromText } from '@/app/actions';
import { EmailFileUpload } from '@/components/email-file-upload';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { usePhishingAnalysis } from '@/hooks/use-phishing-analysis';
import { apiKeyStorage } from '@/lib/storage';
import {
  AlertTriangle,
  CheckCircle,
  FileText,
  Info,
  Loader2,
  RefreshCw,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';

interface ModelSelectionConfig {
  provider: string;
  model: string;
  temperature: number;
  useTools?: boolean;
}

interface EmailAnalyzerProps {
  modelConfig: ModelSelectionConfig | null;
}

export function EmailAnalyzer({ modelConfig }: EmailAnalyzerProps) {
  const [emailContent, setEmailContent] = React.useState('');
  const [parsedEmailData, setParsedEmailData] =
    React.useState<ParsedEmailContent | null>(null);
  const [isParsing, setIsParsing] = React.useState(false);
  const {
    analyzeEmail,
    resetAnalysis,
    retryAnalysis,
    isAnalyzing,
    isCompleted,
    hasError,
    result,
    error,
    stepDescription,
  } = usePhishingAnalysis();

  // 需要從主頁面獲取 API 金鑰
  const [apiKey, setApiKey] = React.useState<string>('');

  const handleAnalyze = async () => {
    if (!emailContent.trim() || !modelConfig || !apiKey) return;

    await analyzeEmail({
      emailContent,
      modelSettings: {
        ...modelConfig,
        apiKey,
      },
    });
  };

  const handleRetry = () => {
    if (!modelConfig || !apiKey) return;

    retryAnalysis({
      emailContent,
      modelSettings: {
        ...modelConfig,
        apiKey,
      },
    });
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'text-danger';
    if (score >= 60) return 'text-warning';
    if (score >= 40) return 'text-brand';
    return 'text-success';
  };

  // 處理郵件文件上傳
  const handleEmailParsed = React.useCallback(
    (content: string, parsedData: ParsedEmailContent) => {
      setEmailContent(content);
      setParsedEmailData(parsedData);
    },
    []
  );

  // 處理文字區域內容變更（移除自動解析）
  const handleEmailContentChange = React.useCallback(
    (value: string) => {
      setEmailContent(value);
      // 如果內容改變，清除之前的解析結果
      if (parsedEmailData) {
        setParsedEmailData(null);
      }
    },
    [parsedEmailData]
  );

  // 手動解析郵件內容
  const handleParseEmailContent = async () => {
    if (!emailContent.trim()) {
      toast.error('請先輸入郵件內容');
      return;
    }

    setIsParsing(true);

    try {
      toast.loading('正在解析郵件內容...', { id: 'parse-email' });

      const response = await parseEmailFromText(emailContent);

      if (!response.success || !response.data) {
        throw new Error(response.error || '郵件解析失敗');
      }

      const parsedEmail = response.data;

      // 更新解析結果
      setParsedEmailData(parsedEmail);

      // 如果解析成功且有格式化的內容，更新文字區域
      if (parsedEmail.fullContent !== emailContent) {
        setEmailContent(parsedEmail.fullContent);
      }

      toast.success('郵件內容解析成功', {
        id: 'parse-email',
        description: `主題: ${parsedEmail.subject}`,
      });
    } catch (error) {
      console.error('解析郵件內容失敗:', error);
      toast.error('郵件內容解析失敗', {
        id: 'parse-email',
        description: error instanceof Error ? error.message : '未知錯誤',
      });
    } finally {
      setIsParsing(false);
    }
  };

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
      <Card className="glass-card glow-hover">
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
              disabled={isAnalyzing || isParsing}
            />
          </div>

          {/* 或者手動輸入 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-2 text-muted-foreground">或手動輸入</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-content">郵件內容</Label>
              {emailContent.trim() && !parsedEmailData && (
                <Button
                  onClick={handleParseEmailContent}
                  disabled={isParsing || isAnalyzing}
                  variant="outline"
                  size="sm"
                  className="glass glass-hover"
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      解析中
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-3 w-3" />
                      解析郵件
                    </>
                  )}
                </Button>
              )}
            </div>
            <Textarea
              id="email-content"
              placeholder="請貼上可疑的郵件內容，或使用上方的檔案上傳功能..."
              value={emailContent}
              onChange={(e) => handleEmailContentChange(e.target.value)}
              className="min-h-[200px] max-h-[500px] glass glass-hover glass-focus resize-none overflow-y-auto"
              disabled={isAnalyzing || isParsing}
            />
            {emailContent.trim() && !parsedEmailData && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <p>
                  提示：點擊「解析郵件」按鈕可以自動格式化郵件內容，提高分析準確度
                </p>
              </div>
            )}
          </div>

          {/* 顯示解析後的郵件資訊 */}
          {parsedEmailData && (
            <div className="glass-minimal spacing-responsive-sm rounded-lg space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <p className="font-medium text-success">已解析的郵件資訊</p>
                </div>
                <Button
                  onClick={() => {
                    setParsedEmailData(null);
                    // 可選：恢復到原始內容
                  }}
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                >
                  清除
                </Button>
              </div>
              <p className="text-sm">主題: {parsedEmailData.subject}</p>
              <p className="text-sm">發件人: {parsedEmailData.from}</p>
              <p className="text-sm">日期: {parsedEmailData.date}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleAnalyze}
              disabled={
                !emailContent.trim() ||
                !modelConfig ||
                !apiKey ||
                isAnalyzing ||
                isParsing
              }
              className="flex-1"
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {stepDescription || '分析中...'}
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
                className="glass glass-hover"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* 錯誤提示 */}
          {!modelConfig && (
            <div className="glass-minimal spacing-responsive-sm rounded-lg glow-warning flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
              <p className="text-sm text-warning">請先選擇模型配置</p>
            </div>
          )}

          {!apiKey && modelConfig && (
            <div className="glass-minimal spacing-responsive-sm rounded-lg glow-warning flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
              <p className="text-sm text-warning">
                請先在設定中配置 {modelConfig.provider} 的 API 金鑰
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 結果區域 */}
      <Card className="glass-card glow-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {result?.isPhishing ? (
              <AlertTriangle className="h-5 w-5 text-danger" />
            ) : result && !result.isPhishing ? (
              <CheckCircle className="h-5 w-5 text-success" />
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
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 text-brand animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">
                {stepDescription || '正在分析郵件內容...'}
              </p>
              <p className="text-sm text-warning">
                請稍候，這可能需要幾秒鐘時間
              </p>
            </div>
          )}

          {hasError && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-4">
                <AlertTriangle className="h-8 w-8 text-danger mx-auto" />
                <div>
                  <p className="text-danger font-medium">分析失敗</p>
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
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-lg">釣魚郵件判定</span>
                  <div
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium text-xs ${
                      result.isPhishing
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                        : 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                    }`}
                  >
                    {result.isPhishing ? (
                      <>
                        <ShieldAlert className="h-4 w-4" />
                        是釣魚郵件
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        非釣魚郵件
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold">信心分數</span>
                  <span
                    className={`text-3xl font-bold ${getConfidenceColor(result.confidenceScore)}`}
                  >
                    {result.confidenceScore}%
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold">風險等級</span>
                  <div
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium text-xs ${
                      result.riskLevel === 'high'
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                        : result.riskLevel === 'medium'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          : 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                    }`}
                  >
                    {result.riskLevel === 'low' && (
                      <>
                        <Shield className="h-4 w-4" />
                        低風險
                      </>
                    )}
                    {result.riskLevel === 'medium' && (
                      <>
                        <AlertTriangle className="h-4 w-4" />
                        中等風險
                      </>
                    )}
                    {result.riskLevel === 'high' && (
                      <>
                        <ShieldAlert className="h-4 w-4" />
                        高風險
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 分隔線 */}
              <div className="border-t border-black/8 dark:border-white/10"></div>

              {/* 可疑點 */}
              {result.suspiciousPoints.length > 0 && (
                <>
                  <div className="space-y-3">
                    <h4 className="font-semibold text-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-warning" />
                      可疑點分析
                    </h4>
                    <ul className="space-y-3">
                      {result.suspiciousPoints.map((point, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-warning/20 text-warning rounded-full flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </span>
                          <div className="flex-1 prose prose-sm max-w-none dark:prose-invert">
                            <div className="text-sm leading-relaxed">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  a: ({ children }) => (
                                    <span className="text-blue-600 dark:text-blue-400 underline">
                                      {children}
                                    </span>
                                  ),
                                }}
                              >
                                {point}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 分隔線 */}
                  <div className="border-t border-black/8 dark:border-white/10"></div>
                </>
              )}

              {/* 詳細說明 - Markdown 渲染 */}
              <div className="space-y-3">
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  <Info className="h-5 w-5 text-brand" />
                  詳細說明
                </h4>
                <div className="glass-minimal rounded-lg p-4 border border-black/8 dark:border-white/10">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <div className="text-sm leading-relaxed">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({ children }) => (
                            <span className="text-blue-600 dark:text-blue-400 underline">
                              {children}
                            </span>
                          ),
                        }}
                      >
                        {result.explanation}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        {result && (
          <CardFooter className="flex-col space-y-4 text-xs text-muted-foreground">
            {/* 分析資訊 */}
            <div className="w-full space-y-1">
              <div>
                分析時間: {new Date(result.timestamp).toLocaleString('zh-TW')}
              </div>
              {modelConfig && (
                <div>
                  使用模型: {modelConfig.provider} - {modelConfig.model} (溫度:{' '}
                  {modelConfig.temperature})
                </div>
              )}
            </div>

            {/* 分隔線 */}
            <div className="w-full border-t border-black/8 dark:border-white/10"></div>

            {/* 重要提醒 */}
            <div className="w-full flex items-start space-x-3">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-warning flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">重要提醒</p>
                <p className="text-xs text-muted-foreground mt-1">
                  此工具僅供參考，最終判斷請結合您的專業知識和直覺。對於重要郵件，建議透過多種管道驗證其真實性。
                </p>
              </div>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
