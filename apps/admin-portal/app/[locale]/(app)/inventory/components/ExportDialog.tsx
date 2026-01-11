'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Label,
  useToast,
} from '@joho-erp/ui';
import { useTranslations } from 'next-intl';
import { Loader2, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { api } from '@/trpc/client';
import { generateExcel } from '../utils/exportUtils';
import { InventoryReportDocument } from './exports/InventoryReportDocument';

type ExportFormat = 'pdf' | 'excel';
type DataScope = 'current' | 'all';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTab: 'overview' | 'trends' | 'turnover' | 'comparison';
  currentFilters: {
    transactionType?: 'sale' | 'adjustment' | 'return';
    productSearch?: string;
    granularity?: 'daily' | 'weekly' | 'monthly';
    comparisonType?: 'week_over_week' | 'month_over_month';
  };
}

export function ExportDialog({
  open,
  onOpenChange,
  currentTab,
  currentFilters,
}: ExportDialogProps) {
  const t = useTranslations('inventory.export');
  const tCommon = useTranslations('common');
  const { toast } = useToast();

  const [format, setFormat] = useState<ExportFormat>('excel');
  const [dataScope, setDataScope] = useState<DataScope>('current');
  const [isGenerating, setIsGenerating] = useState(false);

  const useCurrentFilters = dataScope === 'current';

  const { data, isLoading } = api.inventory.export.getData.useQuery(
    {
      tab: currentTab,
      useCurrentFilters,
      filters: useCurrentFilters ? currentFilters : undefined,
    },
    { enabled: open }
  );

  const getTranslations = useCallback(() => {
    return {
      // Overview
      inventoryOverview: t('overview.title'),
      summary: t('overview.summary'),
      summaryTitle: t('overview.summaryTitle'),
      categories: t('overview.categories'),
      categoryBreakdown: t('overview.categoryBreakdown'),
      transactions: t('overview.transactions'),
      recentTransactions: t('overview.recentTransactions'),

      // Common fields
      category: t('fields.category'),
      productCount: t('fields.productCount'),
      totalStock: t('fields.totalStock'),
      totalValue: t('fields.totalValue'),
      lowStockCount: t('fields.lowStockCount'),
      lowStock: t('fields.lowStock'),
      totalInventoryValue: t('fields.totalInventoryValue'),
      totalProducts: t('fields.totalProducts'),
      lowStockItems: t('fields.lowStockItems'),
      outOfStock: t('fields.outOfStock'),

      // Transaction fields
      date: t('fields.date'),
      time: t('fields.time'),
      productSku: t('fields.productSku'),
      productName: t('fields.productName'),
      sku: t('fields.sku'),
      product: t('fields.product'),
      unit: t('fields.unit'),
      type: t('fields.type'),
      adjustmentType: t('fields.adjustmentType'),
      quantity: t('fields.quantity'),
      previousStock: t('fields.previousStock'),
      newStock: t('fields.newStock'),
      stockChange: t('fields.stockChange'),
      notes: t('fields.notes'),

      // Trends
      inventoryTrends: t('trends.title'),
      stockMovement: t('trends.stockMovement'),
      stockMovementTitle: t('trends.stockMovementTitle'),
      inventoryValue: t('trends.inventoryValue'),
      inventoryValueTitle: t('trends.inventoryValueTitle'),
      period: t('fields.period'),
      stockIn: t('fields.stockIn'),
      stockOut: t('fields.stockOut'),
      netChange: t('fields.netChange'),

      // Turnover
      productTurnover: t('turnover.title'),
      turnoverTitle: t('turnover.turnoverTitle'),
      currentStock: t('fields.currentStock'),
      totalSold: t('fields.totalSold'),
      transactionCount: t('fields.transactionCount'),
      velocity: t('fields.velocity'),
      daysOnHand: t('fields.daysOnHand'),
      days: t('fields.days'),

      // Comparison
      comparisonAnalytics: t('comparison.title'),
      comparisonTitle: t('comparison.comparisonTitle'),
      weekOverWeek: t('comparison.weekOverWeek'),
      monthOverMonth: t('comparison.monthOverMonth'),
      metric: t('fields.metric'),
      current: t('fields.current'),
      currentPeriod: t('fields.currentPeriod'),
      previous: t('fields.previous'),
      previousPeriod: t('fields.previousPeriod'),
      change: t('fields.change'),
      changePercent: t('fields.changePercent'),
      netMovement: t('fields.netMovement'),

      // Footer
      exportedAt: t('fields.exportedAt'),
      exportedOn: t('fields.exportedOn'),
      page: t('fields.page'),
      showingFirst: t('fields.showingFirst'),
    };
  }, [t]);

  const handleExport = useCallback(async () => {
    if (!data) return;

    setIsGenerating(true);

    try {
      const translations = getTranslations();
      const dateStr = new Date().toISOString().split('T')[0];
      let blob: Blob;
      let filename: string;

      if (format === 'pdf') {
        const doc = (
          <InventoryReportDocument
            tab={currentTab}
            data={data}
            translations={translations}
          />
        );
        blob = await pdf(doc).toBlob();
        filename = `inventory-${currentTab}-${dateStr}.pdf`;
      } else {
        blob = generateExcel({ tab: currentTab, data, translations });
        filename = `inventory-${currentTab}-${dateStr}.xlsx`;
      }

      // Download file
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Close dialog
      onOpenChange(false);

      // Success notification
      toast({
        title: t('success'),
        description: t('successDescription'),
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        variant: 'destructive',
        title: t('error'),
        description: t('errorDescription'),
      });
    } finally {
      setIsGenerating(false);
    }
  }, [data, format, currentTab, getTranslations, onOpenChange, t, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Tab Preview */}
          <div>
            <Label className="text-sm text-muted-foreground">{t('exportingTab')}</Label>
            <p className="font-medium capitalize">{currentTab}</p>
          </div>

          {/* Format Selection */}
          <div className="space-y-3">
            <Label>{t('selectFormat')}</Label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <input
                  type="radio"
                  name="format"
                  value="excel"
                  checked={format === 'excel'}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormat(e.target.value as ExportFormat)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    <p className="font-medium">{t('formats.excel')}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('formats.excelDescription')}
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <input
                  type="radio"
                  name="format"
                  value="pdf"
                  checked={format === 'pdf'}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormat(e.target.value as ExportFormat)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <p className="font-medium">{t('formats.pdf')}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('formats.pdfDescription')}
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Data Scope Selection */}
          <div className="space-y-3">
            <Label>{t('dataScope')}</Label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <input
                  type="radio"
                  name="dataScope"
                  value="current"
                  checked={dataScope === 'current'}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDataScope(e.target.value as DataScope)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="font-medium">{t('scope.current')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('scope.currentDescription')}
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <input
                  type="radio"
                  name="dataScope"
                  value="all"
                  checked={dataScope === 'all'}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDataScope(e.target.value as DataScope)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="font-medium">{t('scope.all')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('scope.allDescription')}
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Loading/Preview */}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {tCommon('loading')}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleExport} disabled={isGenerating || isLoading || !data}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('generating')}
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {t('export')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
