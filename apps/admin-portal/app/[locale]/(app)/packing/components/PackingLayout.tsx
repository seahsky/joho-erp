'use client';

import { ReactNode, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Package, ClipboardList } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@joho-erp/ui';

interface PackingLayoutProps {
  summaryPanel: ReactNode;
  ordersPanel: ReactNode;
  gatheredCount: number;
  totalProducts: number;
  packedCount: number;
  totalOrders: number;
}

type TabType = 'summary' | 'orders';

export function PackingLayout({
  summaryPanel,
  ordersPanel,
  gatheredCount,
  totalProducts,
  packedCount,
  totalOrders,
}: PackingLayoutProps) {
  const t = useTranslations('packing');
  const [activeTab, setActiveTab] = useState<TabType>('summary');

  return (
    <>
      {/* Mobile: Tabbed Layout */}
      <div className="lg:hidden space-y-4">
        {/* Tab Navigation */}
        <div className="flex gap-0 border-b border-border">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 py-4 px-6 font-semibold text-sm transition-all relative ${
              activeTab === 'summary'
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Package className="h-5 w-5" />
              <span>{t('summaryPanel')}</span>
            </div>
            {activeTab === 'summary' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary" />
            )}
            <div className="text-xs mt-1 tabular-nums">
              {gatheredCount}/{totalProducts}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-4 px-6 font-semibold text-sm transition-all relative ${
              activeTab === 'orders'
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <ClipboardList className="h-5 w-5" />
              <span>{t('ordersPanel')}</span>
            </div>
            {activeTab === 'orders' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary" />
            )}
            <div className="text-xs mt-1 tabular-nums">
              {packedCount}/{totalOrders}
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {activeTab === 'summary' ? summaryPanel : ordersPanel}
        </div>
      </div>

      {/* Desktop: Side-by-Side Layout */}
      <div className="hidden lg:grid lg:grid-cols-[380px_1fr] gap-6">
        {/* Summary Panel - Fixed Width Sidebar */}
        <div className="space-y-4">
          <div className="sticky top-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {t('summaryPanel')}
                </CardTitle>
                <CardDescription className="tabular-nums">
                  {gatheredCount}/{totalProducts} {t('gathered')}
                </CardDescription>
              </CardHeader>
            </Card>
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
              {summaryPanel}
            </div>
          </div>
        </div>

        {/* Orders Panel - Flexible Width */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                {t('ordersPanel')}
              </CardTitle>
              <CardDescription className="tabular-nums">
                {packedCount}/{totalOrders} {t('ordersPacked')}
              </CardDescription>
            </CardHeader>
          </Card>
          <div>{ordersPanel}</div>
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
}
