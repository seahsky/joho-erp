'use client';

import { UserButton } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Home, Package, ShoppingBag, User } from 'lucide-react';
import { LanguageSwitcher } from '@jimmy-beef/ui';

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function CustomerDesktopNav({ locale }: { locale: string }) {
  const t = useTranslations('navigation');
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { href: `/${locale}`, labelKey: 'home', icon: Home },
    { href: `/${locale}/products`, labelKey: 'products', icon: Package },
    { href: `/${locale}/orders`, labelKey: 'orders', icon: ShoppingBag },
    { href: `/${locale}/profile`, labelKey: 'profile', icon: User },
  ];

  const isActive = (href: string) => {
    if (href === `/${locale}`) {
      return pathname === `/${locale}` || pathname === `/${locale}/`;
    }
    return pathname?.startsWith(href);
  };

  return (
    <>
      {/* Grain texture overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.015]">
        <div className="absolute inset-0 bg-noise" />
      </div>

      {/* Main navigation bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-white via-white to-white/98 backdrop-blur-sm border-b border-neutral-200/60 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-20">
            {/* Logo section */}
            <Link
              href={`/${locale}`}
              className="flex items-center gap-3 group transition-all duration-300"
            >
              <div className="relative">
                {/* Logo background with animation */}
                <div className="absolute inset-0 bg-gradient-to-br from-[hsl(0,67%,35%)] to-[hsl(0,67%,25%)] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />

                <div className="relative w-12 h-12 bg-gradient-to-br from-[hsl(0,67%,35%)] to-[hsl(0,67%,28%)] rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="w-7 h-7 text-white"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
              </div>

              <div className="flex flex-col">
                <span className="text-xl font-semibold tracking-tight text-neutral-900 group-hover:text-[hsl(0,67%,35%)] transition-colors duration-300">
                  Jimmy Beef
                </span>
                <span className="text-xs tracking-wider uppercase text-neutral-500 font-medium">
                  Premium Wholesale
                </span>
              </div>
            </Link>

            {/* Navigation items - centered */}
            <div className="hidden xl:flex items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      group relative px-6 py-3 rounded-lg font-medium text-sm
                      transition-all duration-300 ease-out
                      ${active
                        ? 'text-white'
                        : 'text-neutral-700 hover:text-neutral-900'
                      }
                    `}
                  >
                    {/* Active background */}
                    {active && (
                      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(0,67%,35%)] to-[hsl(0,67%,28%)] rounded-lg shadow-md" />
                    )}

                    {/* Hover background */}
                    {!active && (
                      <div className="absolute inset-0 bg-neutral-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    )}

                    {/* Content */}
                    <div className="relative flex items-center gap-2">
                      <Icon className={`w-4 h-4 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
                      <span className="tracking-wide">{t(item.labelKey)}</span>
                    </div>

                    {/* Active indicator line */}
                    {active && (
                      <div className="absolute -bottom-[17px] left-1/2 -translate-x-1/2 w-12 h-0.5 bg-gradient-to-r from-transparent via-[hsl(0,67%,35%)] to-transparent" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Compact nav for smaller desktops */}
            <div className="flex xl:hidden items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      group relative p-3 rounded-lg
                      transition-all duration-300 ease-out
                      ${active
                        ? 'text-white bg-gradient-to-br from-[hsl(0,67%,35%)] to-[hsl(0,67%,28%)] shadow-md'
                        : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100'
                      }
                    `}
                    title={t(item.labelKey)}
                  >
                    <Icon className={`w-5 h-5 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
                  </Link>
                );
              })}
            </div>

            {/* Right section - User controls */}
            <div className="flex items-center gap-4">
              <div className="hidden md:block">
                <LanguageSwitcher />
              </div>

              <div className="h-10 w-px bg-neutral-200" />

              <div className="relative">
                {/* Glow effect on hover */}
                <div className="absolute inset-0 bg-[hsl(0,67%,35%)] rounded-full opacity-0 hover:opacity-20 blur-xl transition-opacity duration-500" />
                <UserButton
                  afterSignOutUrl={`/${locale}/sign-in`}
                  appearance={{
                    elements: {
                      avatarBox: 'w-10 h-10 ring-2 ring-neutral-200 hover:ring-[hsl(0,67%,35%)] transition-all duration-300',
                    },
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom gradient line for depth */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neutral-300 to-transparent opacity-50" />
      </nav>

      {/* Spacer to prevent content from going under fixed nav */}
      <div className="h-20" />
    </>
  );
}
