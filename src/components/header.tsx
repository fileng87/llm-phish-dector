'use client';

import * as React from 'react';

import { SettingsDialog } from './settings-dialog';
import { ThemeToggle } from './theme-toggle';

interface ModelConfig {
  provider: string;
  apiKey: string;
  isEnabled: boolean;
}

interface HeaderProps {
  providerConfigs: Record<string, ModelConfig>;
  onProviderConfigsChange: (configs: Record<string, ModelConfig>) => void;
}

export function Header({
  providerConfigs,
  onProviderConfigsChange,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b glass-card backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center glow">
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                釣魚郵件偵測器
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <SettingsDialog
              providerConfigs={providerConfigs}
              onProviderConfigsChange={onProviderConfigsChange}
            />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
