'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner, ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'glass-card !bg-background/80 !backdrop-blur-lg !border-white/20 dark:!border-white/10 !shadow-xl [&]:!bg-background/80 [&]:!backdrop-blur-lg',
          description: 'text-muted-foreground',
          actionButton:
            'glass !bg-primary !text-primary-foreground hover:!bg-primary/90',
          cancelButton:
            'glass !bg-muted !text-muted-foreground hover:!bg-muted/90',
          closeButton:
            'glass !bg-muted !text-muted-foreground hover:!bg-muted/90',
          success:
            '!text-green-600 dark:!text-green-400 !border-green-500/20 [&]:!bg-background/80',
          error:
            '!text-red-600 dark:!text-red-400 !border-red-500/20 [&]:!bg-background/80',
          warning:
            '!text-amber-600 dark:!text-amber-400 !border-amber-500/20 [&]:!bg-background/80',
          info: '!text-blue-600 dark:!text-blue-400 !border-blue-500/20 [&]:!bg-background/80',
        },
        style: {
          backgroundColor: 'transparent',
          backdropFilter: 'blur(16px)',
        },
      }}
      style={
        {
          '--normal-bg': 'transparent',
          '--normal-text': 'var(--foreground)',
          '--normal-border': 'var(--border)',
          '--success-bg': 'transparent',
          '--success-text': 'var(--foreground)',
          '--success-border': 'rgb(34 197 94 / 0.2)',
          '--error-bg': 'transparent',
          '--error-text': 'var(--foreground)',
          '--error-border': 'rgb(239 68 68 / 0.2)',
          '--warning-bg': 'transparent',
          '--warning-text': 'var(--foreground)',
          '--warning-border': 'rgb(245 158 11 / 0.2)',
          '--info-bg': 'transparent',
          '--info-text': 'var(--foreground)',
          '--info-border': 'rgb(59 130 246 / 0.2)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
