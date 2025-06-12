'use client';

import * as React from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  EmailParseError,
  ParsedEmailContent,
  detectEncryptedContent,
  parseEmailFile,
} from '@/lib/email-parser';
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

    try {
      toast.loading(`正在解析郵件文件: ${file.name}`, { id: 'file-upload' });

      // 解析郵件文件
      const parsedEmail = await parseEmailFile(file);

      // 檢測加密內容
      const encryptionInfo = detectEncryptedContent(parsedEmail.fullContent);
      if (encryptionInfo.isEncrypted && encryptionInfo.warning) {
        setEncryptionWarning(encryptionInfo.warning);
      }

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

      let errorMessage = '郵件文件解析失敗';
      if (error instanceof EmailParseError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = `解析失敗: ${error.message}`;
      }

      toast.error(errorMessage, {
        id: 'file-upload',
        duration: 6000,
      });

      setUploadedFile(null);
    } finally {
      setIsUploading(false);
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

  const handleClearFile = () => {
    setUploadedFile(null);
    setEncryptionWarning(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <Card
        className={`
          glass-card transition-all duration-200 cursor-pointer
          ${isDragOver ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : ''}
          ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400'}
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
                <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <div>
                  <p className="font-medium">正在解析郵件文件...</p>
                  <p className="text-sm text-muted-foreground">
                    {uploadedFile?.name}
                  </p>
                </div>
              </>
            ) : uploadedFile ? (
              <>
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <div>
                  <p className="font-medium text-green-600 dark:text-green-400">
                    文件上傳成功
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {uploadedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(uploadedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearFile();
                  }}
                  className="mt-2"
                >
                  重新上傳
                </Button>
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
        <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
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
