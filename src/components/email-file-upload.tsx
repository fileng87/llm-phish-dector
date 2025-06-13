'use client';

import * as React from 'react';

import {
  type ParsedEmailContent,
  detectEncryptedContent,
  parseEmailFile,
} from '@/app/actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, FileText, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface EmailFileUploadProps {
  onEmailParsed: (content: string, parsedData: ParsedEmailContent) => void;
  disabled?: boolean;
}

export function EmailFileUpload({
  onEmailParsed,
  disabled = false,
}: EmailFileUploadProps) {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [uploadStage, setUploadStage] = React.useState<string>('');
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null);
  const [encryptionWarning, setEncryptionWarning] = React.useState<
    string | null
  >(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (disabled || isUploading) return;

    setIsUploading(true);
    setUploadedFile(file);
    setEncryptionWarning(null);
    setUploadProgress(0);

    try {
      toast.loading(`正在解析郵件文件: ${file.name}`, { id: 'file-upload' });

      // 模擬進度更新
      const updateProgress = (stage: string, progress: number) => {
        setUploadStage(stage);
        setUploadProgress(progress);
      };

      // 階段 1: 文件讀取
      updateProgress('正在讀取文件...', 20);
      await new Promise((resolve) => setTimeout(resolve, 300));

      // 創建 FormData 並發送到後端解析
      const formData = new FormData();
      formData.append('file', file);

      // 階段 2: 上傳文件
      updateProgress('正在上傳文件...', 40);
      await new Promise((resolve) => setTimeout(resolve, 200));

      // 階段 3: 解析郵件
      updateProgress('正在解析郵件內容...', 60);
      const response = await parseEmailFile(formData);

      if (!response.success || !response.data) {
        throw new Error(response.error || '郵件解析失敗');
      }

      const parsedEmail = response.data;

      // 階段 4: 檢測加密內容
      updateProgress('正在檢測加密內容...', 80);
      const encryptionInfo = await detectEncryptedContent(
        parsedEmail.fullContent
      );
      if (encryptionInfo.isEncrypted && encryptionInfo.warning) {
        setEncryptionWarning(encryptionInfo.warning);
      }

      // 階段 5: 完成
      updateProgress('解析完成', 100);
      await new Promise((resolve) => setTimeout(resolve, 200));

      // 回調函數，將解析後的內容傳遞給父元件
      onEmailParsed(parsedEmail.fullContent, parsedEmail);

      toast.success(`郵件文件解析成功: ${file.name}`, {
        id: 'file-upload',
        description: `主題: ${parsedEmail.subject}`,
      });
    } catch (error) {
      console.error('郵件文件上傳失敗:', {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : 'Unknown',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });

      const errorMessage =
        error instanceof Error ? error.message : '郵件文件解析失敗';

      toast.error(errorMessage, {
        id: 'file-upload',
        duration: 6000,
      });

      setUploadedFile(null);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStage('');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled || isUploading) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUploadClick = () => {
    if (!disabled && !isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-4">
      <Card
        className={`
          glass transition-all duration-300 cursor-pointer
          ${isDragOver ? 'border-blue-500/50 bg-blue-500/10' : ''}
          ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/20 dark:hover:bg-white/10'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleUploadClick}
      >
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            {isUploading ? (
              <>
                <div className="w-full max-w-xs space-y-3">
                  {/* 進度條 */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">
                        {uploadStage || '正在處理...'}
                      </span>
                      <span className="text-muted-foreground">
                        {uploadProgress}%
                      </span>
                    </div>
                    <Progress value={uploadProgress} className="w-full" />
                  </div>

                  {/* 文件信息 */}
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      {uploadedFile?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {uploadedFile
                        ? (uploadedFile.size / 1024).toFixed(1)
                        : '0'}{' '}
                      KB
                    </p>
                  </div>
                </div>
              </>
            ) : uploadedFile ? (
              <>
                <CheckCircle2 className="h-12 w-12 text-success" />
                <div>
                  <p className="font-medium text-success">文件上傳成功</p>
                  <p className="text-sm text-muted-foreground">
                    {uploadedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(uploadedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </>
            ) : (
              <>
                <Upload className="h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="font-medium">上傳郵件文件</p>
                  <p className="text-sm text-muted-foreground">
                    拖拽文件到此處或點擊選擇文件
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    支援 .eml、.msg、.txt、.mbox 格式，最大 10MB
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 加密警告 */}
      {encryptionWarning && (
        <Alert className="bg-warning-light border-warning">
          <AlertCircle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning">
            {encryptionWarning}
          </AlertDescription>
        </Alert>
      )}

      {/* 支援的文件格式說明 */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p className="font-medium">支援的文件格式：</p>
        <div className="grid grid-cols-2 gap-1">
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>.eml (標準郵件格式)</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>.msg (Outlook 格式)</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>.txt (純文字格式)</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>.mbox (郵箱格式)</span>
          </div>
        </div>
      </div>

      {/* 隱藏的文件輸入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".eml,.msg,.txt,.mbox,message/rfc822,text/plain,application/octet-stream"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled || isUploading}
      />
    </div>
  );
}
