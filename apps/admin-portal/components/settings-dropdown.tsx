'use client';

import { Moon, Sun, Monitor, Bell, Lock, HelpCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

interface SettingsDropdownProps {
  onClose: () => void;
}

export function SettingsDropdown({ onClose }: SettingsDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('settings.dropdown');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const themeOptions = [
    { value: 'light', label: t('light'), icon: Sun },
    { value: 'dark', label: t('dark'), icon: Moon },
    { value: 'system', label: t('system'), icon: Monitor },
  ];

  const settingsItems = [
    { label: t('notifications'), icon: Bell, action: () => router.push(`/${locale}/settings/notifications`) },
    { label: t('privacySecurity'), icon: Lock, action: () => router.push(`/${locale}/settings/profile#security`) },
  ];

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-12 w-72 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 fade-in-0 duration-200 z-50"
    >
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border bg-muted/30">
        <h3 className="font-semibold text-sm">{t('header')}</h3>
      </div>

      {/* Theme Selection */}
      {mounted && (
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
            {t('appearance')}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isActive = theme === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all ${
                    isActive
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'border-border hover:bg-muted hover:border-muted-foreground/20'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-medium">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Settings Items */}
      <div className="py-1">
        {settingsItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => {
                item.action();
                onClose();
              }}
              className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-muted/50 transition-colors text-foreground"
            >
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Footer - Help */}
      <div className="border-t border-border">
        <button
          onClick={() => {
            router.push(`/${locale}/settings`);
            onClose();
          }}
          className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
        >
          <HelpCircle className="w-4 h-4" />
          <span className="text-sm font-medium">{t('allSettings')}</span>
        </button>
      </div>
    </div>
  );
}
