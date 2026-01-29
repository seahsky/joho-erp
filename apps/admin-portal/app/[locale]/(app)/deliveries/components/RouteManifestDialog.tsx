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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from '@joho-erp/ui';
import { useTranslations } from 'next-intl';
import { Loader2, FileText, Download, FileStack } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { api } from '@/trpc/client';
import { formatAUD } from '@joho-erp/shared';
import { RouteManifestDocument, type ManifestTranslations } from './manifest';

interface RouteManifestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  selectedArea?: string; // Area ID or 'all'
}

type LayoutOption = 'one-per-page' | 'compact';

// Types for manifest data from API
interface ManifestItem {
  sku: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPriceCents: number;
  subtotalCents: number;
}

interface ManifestStop {
  sequence: number;
  orderId: string;
  orderNumber: string;
  customer: {
    name: string;
    phone: string | null;
  };
  address: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
    deliveryInstructions: string | null;
  };
  items: ManifestItem[];
  subtotalCents: number;
  taxAmountCents: number;
  totalAmountCents: number;
}

export function RouteManifestDialog({
  open,
  onOpenChange,
  selectedDate,
  selectedArea,
}: RouteManifestDialogProps) {
  const t = useTranslations('deliveries.manifest');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const { toast } = useToast();

  const [layout, setLayout] = useState<LayoutOption>('one-per-page');
  const [areaFilter, setAreaFilter] = useState<string>(selectedArea || 'all');
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch areas dynamically
  const { data: areas } = api.area.list.useQuery();

  const { data: manifestData, isLoading } = api.delivery.getManifestData.useQuery(
    {
      deliveryDate: selectedDate.toISOString(),
      areaId: areaFilter !== 'all' ? areaFilter : undefined,
    },
    {
      enabled: open,
    }
  );

  // Query for invoice URLs when there are orders
  const { data: invoiceData, isLoading: isLoadingInvoices } = api.delivery.getInvoiceUrlsForDelivery.useQuery(
    {
      deliveryDate: selectedDate.toISOString(),
      areaId: areaFilter !== 'all' ? areaFilter : undefined,
    },
    {
      enabled: open && !!manifestData?.stops?.length,
    }
  );

  const [isDownloadingInvoices, setIsDownloadingInvoices] = useState(false);

  const downloadAllInvoices = useCallback(async () => {
    if (!invoiceData?.invoices?.length) return;

    setIsDownloadingInvoices(true);

    try {
      // Filter invoices that have URLs
      const invoicesWithUrls = invoiceData.invoices.filter((inv) => inv.url);

      if (invoicesWithUrls.length === 0) {
        toast({
          title: tErrors('noInvoices'),
          variant: 'destructive',
        });
        return;
      }

      // Open each invoice URL in a new tab (browsers may block multiple popups)
      // Show toast with count
      invoicesWithUrls.forEach((inv, index) => {
        // Stagger the opening to avoid popup blockers
        setTimeout(() => {
          if (inv.url) {
            window.open(inv.url, `_blank_${index}`);
          }
        }, index * 200);
      });

      toast({
        title: t('invoicesOpened'),
        description: t('invoicesOpenedDescription', { count: invoicesWithUrls.length }),
      });
    } catch (error) {
      console.error('Error downloading invoices:', error);
      toast({
        title: tErrors('generationFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsDownloadingInvoices(false);
    }
  }, [invoiceData, toast, tErrors, t]);

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const getTranslations = useCallback((): ManifestTranslations => {
    return {
      title: t('summary.title'),
      date: t('summary.date'),
      area: t('summary.area'),
      allAreas: t('allAreas'),
      driver: t('summary.driver'),
      unassigned: t('summary.unassigned'),
      totalStops: t('summary.totalStops'),
      estimatedDistance: t('summary.estimatedDistance'),
      estimatedDuration: t('summary.estimatedDuration'),
      warehouseStart: t('summary.warehouseStart'),
      stopOverview: t('summary.stopOverview'),
      productSummaryTitle: t('summary.productSummary'),
      productSummaryDescription: t('summary.productSummaryDescription'),
      stopNumber: t('stop.stopNumber'),
      orderNumber: t('stop.orderNumber'),
      customer: t('stop.customer'),
      address: t('stop.address'),
      phone: t('stop.phone'),
      deliveryInstructions: t('stop.deliveryInstructions'),
      noInstructions: t('stop.noInstructions'),
      items: t('stop.items'),
      stop: t('table.stop'),
      suburb: t('table.suburb'),
      sku: t('table.sku'),
      product: t('table.product'),
      quantity: t('table.quantity'),
      unit: t('table.unit'),
      unitPrice: t('table.unitPrice'),
      subtotal: t('table.subtotal'),
      totalQuantity: t('table.totalQuantity'),
      totalsSubtotal: t('totals.subtotal'),
      gst: t('totals.gst'),
      total: t('totals.total'),
      signatureTitle: t('signature.title'),
      signatureLine: t('signature.signatureLine'),
      printedName: t('signature.printedName'),
      timeReceived: t('signature.timeReceived'),
      driverNotes: t('signature.driverNotes'),
      summaryPage: t('summary.summaryPage'),
      stopFooter: t('stop.stopFooter'),
    };
  }, [t]);

  const generatePdf = useCallback(async () => {
    if (!manifestData || manifestData.stops.length === 0) return;

    setIsGenerating(true);

    try {
      // Format prices for display
      const formattedStops = manifestData.stops.map((stop: ManifestStop) => ({
        ...stop,
        items: stop.items.map((item: ManifestItem) => ({
          ...item,
          formattedUnitPrice: formatAUD(item.unitPriceCents),
          formattedSubtotal: formatAUD(item.subtotalCents),
        })),
        formattedSubtotal: formatAUD(stop.subtotalCents),
        formattedTax: formatAUD(stop.taxAmountCents),
        formattedTotal: formatAUD(stop.totalAmountCents),
      }));

      const doc = (
        <RouteManifestDocument
          manifestDate={formatDate(new Date(manifestData.manifestDate))}
          areaName={manifestData.areaName}
          warehouseAddress={manifestData.warehouseAddress}
          routeSummary={manifestData.routeSummary}
          stops={formattedStops}
          productAggregation={manifestData.productAggregation}
          translations={getTranslations()}
          layout={layout}
        />
      );

      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);

      // Create filename
      const dateStr = selectedDate.toISOString().split('T')[0];
      const areaStr = areaFilter !== 'all' ? `-${areaFilter}` : '';
      const filename = `delivery-manifest-${dateStr}${areaStr}.pdf`;

      // Download the PDF
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(url);

      // Close dialog after successful generation
      onOpenChange(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: tErrors('generationFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [manifestData, layout, selectedDate, areaFilter, getTranslations, onOpenChange]);

  const hasOrders = manifestData && manifestData.stops.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date Display */}
          <div>
            <Label className="text-sm text-muted-foreground">{t('dateLabel')}</Label>
            <p className="font-medium">{formatDate(selectedDate)}</p>
          </div>

          {/* Area Filter - Dynamic areas from API */}
          <div className="space-y-2">
            <Label htmlFor="area-select">{t('areaLabel')}</Label>
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger id="area-select">
                <SelectValue placeholder={t('allAreas')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allAreas')}</SelectItem>
                {areas?.map((area) => (
                  <SelectItem key={area.id} value={area.id}>
                    {area.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Layout Options */}
          <div className="space-y-3">
            <Label>{t('layoutOptions')}</Label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <input
                  type="radio"
                  name="layout"
                  value="one-per-page"
                  checked={layout === 'one-per-page'}
                  onChange={() => setLayout('one-per-page')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="font-medium">{t('onePerPage')}</p>
                  <p className="text-sm text-muted-foreground">{t('onePerPageDescription')}</p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <input
                  type="radio"
                  name="layout"
                  value="compact"
                  checked={layout === 'compact'}
                  onChange={() => setLayout('compact')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="font-medium">{t('compactLayout')}</p>
                  <p className="text-sm text-muted-foreground">{t('compactLayoutDescription')}</p>
                </div>
              </label>
            </div>
          </div>

          {/* Order Count Preview */}
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {tCommon('loading')}
            </div>
          ) : hasOrders ? (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                <span className="font-semibold">{manifestData.routeSummary.totalStops}</span>{' '}
                {t('summary.totalStops').toLowerCase()}
              </p>
            </div>
          ) : (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg">
              <p className="text-sm">{t('noOrdersFound')}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating || isDownloadingInvoices}>
            {tCommon('cancel')}
          </Button>
          <Button
            variant="secondary"
            onClick={downloadAllInvoices}
            disabled={isDownloadingInvoices || isLoadingInvoices || !invoiceData?.ordersWithInvoices}
          >
            {isDownloadingInvoices ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('downloadingInvoices')}
              </>
            ) : (
              <>
                <FileStack className="h-4 w-4 mr-2" />
                {t('downloadInvoices')} {invoiceData?.ordersWithInvoices ? `(${invoiceData.ordersWithInvoices})` : ''}
              </>
            )}
          </Button>
          <Button onClick={generatePdf} disabled={isGenerating || isLoading || !hasOrders}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('generating')}
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {t('generatePdf')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
