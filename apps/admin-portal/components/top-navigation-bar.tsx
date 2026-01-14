'use client';

import { Bell, Settings, Search } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { NotificationsDropdown } from './notifications-dropdown';
import { SettingsDropdown } from './settings-dropdown';
import { LanguageSwitcher } from './language-switcher';
import { QuickSearch } from './quick-search';

export function TopNavigationBar() {
  const t = useTranslations('navigation');
  const tCommon = useTranslations('common');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[hsl(var(--nav-bg))] border-b border-[hsl(var(--nav-border))] z-50 backdrop-blur-sm bg-opacity-95">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Left Section - Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 group cursor-pointer">
            <Image
              src="/logo.png"
              alt={tCommon('brand')}
              width={36}
              height={36}
              className="rounded-lg shadow-sm transition-all group-hover:shadow-md group-hover:scale-105"
            />
            <div className="flex flex-col">
              <span className="font-bold text-base leading-tight tracking-tight text-foreground">
                {tCommon('brand')}
              </span>
              <span className="text-[10px] leading-tight text-muted-foreground uppercase tracking-wider font-medium">
                {t('admin')}
              </span>
            </div>
          </div>
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-3">
          {/* Quick Search */}
          <button
            onClick={() => setShowSearch(true)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground border border-transparent hover:border-border group"
          >
            <Search className="w-4 h-4" />
            <span className="text-sm">{tCommon('search')}...</span>
            <kbd className="hidden lg:inline-flex h-5 px-1.5 items-center gap-1 rounded border border-border bg-background font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>

          {/* Mobile Search Button */}
          <button
            onClick={() => setShowSearch(true)}
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Divider */}
          <div className="h-6 w-px bg-border" />

          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground relative group"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full border-2 border-[hsl(var(--nav-bg))] animate-pulse" />
            </button>
            {showNotifications && (
              <NotificationsDropdown onClose={() => setShowNotifications(false)} />
            )}
          </div>

          {/* Settings */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <Settings className="w-5 h-5" />
            </button>
            {showSettings && (
              <SettingsDropdown onClose={() => setShowSettings(false)} />
            )}
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-border" />

          {/* User Profile */}
          <div className="flex items-center gap-2">
            <UserButton
              afterSignOutUrl="/sign-in"
              appearance={{
                elements: {
                  avatarBox: 'w-8 h-8 ring-2 ring-border hover:ring-primary transition-all',
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Quick Search Modal */}
      {showSearch && <QuickSearch onClose={() => setShowSearch(false)} />}
    </header>
  );
}
