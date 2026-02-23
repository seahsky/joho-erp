'use client';

import { useState, useCallback, useEffect } from 'react';
import { printPdfBlob } from '@/lib/printPdf';
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
import { Loader2, FileText, FileStack, Printer, RefreshCw } from 'lucide-react';
import { api } from '@/trpc/client';

interface RouteManifestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  selectedArea?: string; // Area ID or 'all'
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

  const [areaFilter, setAreaFilter] = useState<string>(selectedArea || 'all');

  // Fetch areas dynamically
  const { data: areas } = api.area.list.useQuery();

  // Query for invoice URLs
  const { data: invoiceData, isLoading: isLoadingInvoices } = api.delivery.getInvoiceUrlsForDelivery.useQuery(
    {
      dateFrom: selectedDate,
      dateTo: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59, 999),
      areaId: areaFilter !== 'all' ? areaFilter : undefined,
    },
    {
      enabled: open,
    }
  );

  const [isDownloadingInvoices, setIsDownloadingInvoices] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number } | null>(null);
  const [printProgress, setPrintProgress] = useState<{ current: number; total: number } | null>(null);
  const [failedInvoices, setFailedInvoices] = useState<Array<{ orderId: string; url: string }>>([]);

  const downloadAllInvoices = useCallback(async () => {
    if (!invoiceData?.invoices?.length) return;

    setIsDownloadingInvoices(true);
    setFailedInvoices([]);

    try {
      const invoicesWithUrls = invoiceData.invoices.filter((inv) => inv.url);

      if (invoicesWithUrls.length === 0) {
        toast({
          title: tErrors('noInvoices'),
          variant: 'destructive',
        });
        return;
      }

      const failed: Array<{ orderId: string; url: string }> = [];

      for (let i = 0; i < invoicesWithUrls.length; i++) {
        const inv = invoicesWithUrls[i];
        setDownloadProgress({ current: i + 1, total: invoicesWithUrls.length });
        try {
          if (inv.url) {
            const opened = window.open(inv.url, `_blank_${i}`);
            if (!opened) {
              failed.push({ orderId: inv.orderId, url: inv.url });
            }
          }
        } catch {
          failed.push({ orderId: inv.orderId, url: inv.url! });
        }
        if (i < invoicesWithUrls.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      setFailedInvoices(failed);

      if (failed.length === 0) {
        toast({
          title: t('invoicesOpened'),
          description: t('invoicesOpenedDescription', { count: invoicesWithUrls.length }),
        });
      } else {
        toast({
          title: t('downloadFailed', { failed: failed.length, total: invoicesWithUrls.length }),
          variant: 'destructive',
        });
      }
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

  const handlePrint = useCallback(async () => {
    if (!invoiceData?.invoices?.length) return;

    setIsPrinting(true);

    try {
      const invoicesWithUrls = invoiceData.invoices.filter((inv) => inv.url);

      if (invoicesWithUrls.length === 0) {
        toast({
          title: tErrors('noInvoices'),
          variant: 'destructive',
        });
        return;
      }

      for (let i = 0; i < invoicesWithUrls.length; i++) {
        const inv = invoicesWithUrls[i];
        if (!inv.url) continue;

        setPrintProgress({ current: i + 1, total: invoicesWithUrls.length });
        const response = await fetch(inv.url);
        const blob = await response.blob();
        printPdfBlob(blob);

        // Small delay between prints to let the browser handle each dialog
        if (i < invoicesWithUrls.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      toast({
        title: t('invoicesOpened'),
        description: t('invoicesOpenedDescription', { count: invoicesWithUrls.length }),
      });
    } catch (error) {
      console.error('Error printing invoices:', error);
      toast({
        title: tErrors('generationFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsPrinting(false);
      setPrintProgress(null);
    }
  }, [invoiceData, toast, tErrors, t]);

  const retryFailedInvoices = useCallback(async () => {
    if (failedInvoices.length === 0) return;
    setIsDownloadingInvoices(true);

    const stillFailed: Array<{ orderId: string; url: string }> = [];

    for (let i = 0; i < failedInvoices.length; i++) {
      const inv = failedInvoices[i];
      setDownloadProgress({ current: i + 1, total: failedInvoices.length });
      try {
        const opened = window.open(inv.url, `_blank_retry_${i}`);
        if (!opened) {
          stillFailed.push(inv);
        }
      } catch {
        stillFailed.push(inv);
      }
      if (i < failedInvoices.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    setFailedInvoices(stillFailed);

    if (stillFailed.length === 0) {
      toast({ title: t('downloadComplete') });
      setDownloadProgress(null);
    } else {
      toast({
        title: t('downloadFailed', { failed: stillFailed.length, total: failedInvoices.length }),
        variant: 'destructive',
      });
    }

    setIsDownloadingInvoices(false);
  }, [failedInvoices, toast, t]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setFailedInvoices([]);
      setDownloadProgress(null);
      setPrintProgress(null);
    }
  }, [open]);

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

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

          {/* Invoice Count Preview */}
          {isLoadingInvoices ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {tCommon('loading')}
            </div>
          ) : invoiceData?.totalOrders ? (
            <div className="p-3 bg-muted rounded-lg space-y-1">
              <p className="text-sm">
                {t('invoiceStatus', { withInvoices: invoiceData.ordersWithInvoices, total: invoiceData.totalOrders })}
              </p>
              {invoiceData.totalOrders > invoiceData.ordersWithInvoices && (
                <p className="text-xs text-muted-foreground">
                  {t('invoicesPending', { count: invoiceData.totalOrders - invoiceData.ordersWithInvoices })}
                </p>
              )}
            </div>
          ) : (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg">
              <p className="text-sm">{t('noOrdersFound')}</p>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {(downloadProgress || printProgress) && (
          <div className="px-6 pb-2 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {downloadProgress
                  ? t('downloadingProgress', { current: downloadProgress.current, total: downloadProgress.total })
                  : t('printingProgress', { current: printProgress!.current, total: printProgress!.total })}
              </span>
              <span>
                {Math.round(
                  ((downloadProgress || printProgress)!.current / (downloadProgress || printProgress)!.total) * 100
                )}
                %
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${((downloadProgress || printProgress)!.current / (downloadProgress || printProgress)!.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDownloadingInvoices || isPrinting}>
            {tCommon('cancel')}
          </Button>
          <Button
            variant="secondary"
            onClick={handlePrint}
            disabled={isPrinting || isLoadingInvoices || !invoiceData?.ordersWithInvoices}
          >
            {isPrinting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {printProgress
                  ? t('printingProgress', { current: printProgress.current, total: printProgress.total })
                  : t('printingInvoices')}
              </>
            ) : (
              <>
                <Printer className="h-4 w-4 mr-2" />
                {t('printInvoices')}
              </>
            )}
          </Button>
          {failedInvoices.length > 0 && !isDownloadingInvoices ? (
            <Button onClick={retryFailedInvoices}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('retryFailed', { count: failedInvoices.length })}
            </Button>
          ) : (
            <Button
              onClick={downloadAllInvoices}
              disabled={isDownloadingInvoices || isLoadingInvoices || !invoiceData?.ordersWithInvoices}
            >
              {isDownloadingInvoices ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {downloadProgress
                    ? t('downloadingProgress', { current: downloadProgress.current, total: downloadProgress.total })
                    : t('downloadingInvoices')}
                </>
              ) : (
                <>
                  <FileStack className="h-4 w-4 mr-2" />
                  {t('downloadInvoices')} {invoiceData?.ordersWithInvoices ? `(${invoiceData.ordersWithInvoices})` : ''}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
