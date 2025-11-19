'use client';

import { ReactNode, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Package, ClipboardList } from 'lucide-react';

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
        <div className="flex gap-0 border-b-2 border-slate-200">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 py-4 px-6 font-bold uppercase tracking-wider text-sm transition-all relative ${
              activeTab === 'summary'
                ? 'text-orange-600 bg-orange-50'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Package className="h-5 w-5" />
              <span>{t('summaryPanel')}</span>
            </div>
            {activeTab === 'summary' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-600" />
            )}
            <div className="text-xs mt-1 font-mono">
              {gatheredCount}/{totalProducts}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-4 px-6 font-bold uppercase tracking-wider text-sm transition-all relative ${
              activeTab === 'orders'
                ? 'text-orange-600 bg-orange-50'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <ClipboardList className="h-5 w-5" />
              <span>{t('ordersPanel')}</span>
            </div>
            {activeTab === 'orders' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-600" />
            )}
            <div className="text-xs mt-1 font-mono">
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
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-4 rounded-t-lg border-b-4 border-orange-500">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500 rounded">
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-bold uppercase tracking-wider text-sm">
                    {t('summaryPanel')}
                  </h2>
                  <p className="text-xs font-mono text-slate-300 mt-0.5">
                    {gatheredCount}/{totalProducts} {t('gathered')}
                  </p>
                </div>
              </div>
            </div>
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
              {summaryPanel}
            </div>
          </div>
        </div>

        {/* Orders Panel - Flexible Width */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-4 rounded-t-lg border-b-4 border-orange-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500 rounded">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-bold uppercase tracking-wider text-sm">
                  {t('ordersPanel')}
                </h2>
                <p className="text-xs font-mono text-slate-300 mt-0.5">
                  {packedCount}/{totalOrders} {t('ordersPacked')}
                </p>
              </div>
            </div>
          </div>
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
