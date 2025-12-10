'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Button,
} from '@joho-erp/ui';
import { Loader2, Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { api } from '@/trpc/client';
import { parseToCents } from '@joho-erp/shared';

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BulkImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: BulkImportDialogProps) {
  const t = useTranslations('bulkImportDialog');
  const [csvData, setCsvData] = useState('');
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: { row: number; error: string }[];
  } | null>(null);

  const bulkImportMutation = api.pricing.bulkImport.useMutation({
    onSuccess: (result) => {
      setImportResult(result);
      if (result.failed === 0) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvData(text);
      setError('');
      setImportResult(null);
    };
    reader.readAsText(file);
  };

  const parseCsvData = (csv: string) => {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) {
      throw new Error(t('validation.csvHeaderRowRequired'));
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const data: Array<{
      customerAbn: string;
      productSku: string;
      customPrice: number;
      effectiveFrom?: Date;
      effectiveTo?: Date;
    }> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const row: Record<string, string> = {};

      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      data.push({
        customerAbn: row['customer_abn'] || row['abn'],
        productSku: row['product_sku'] || row['sku'],
        customPrice: parseToCents(row['custom_price'] || row['price']) || 0,
        effectiveFrom: row['effective_from'] ? new Date(row['effective_from']) : undefined,
        effectiveTo: row['effective_to'] ? new Date(row['effective_to']) : undefined,
      });
    }

    return data;
  };

  const handleImport = async () => {
    setError('');
    setImportResult(null);

    if (!csvData.trim()) {
      setError(t('validation.uploadCsvRequired'));
      return;
    }

    try {
      const pricings = parseCsvData(csvData);
      await bulkImportMutation.mutateAsync({ pricings });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleReset = () => {
    setCsvData('');
    setError('');
    setImportResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* CSV Format Instructions */}
          <div className="bg-muted p-4 rounded-md">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t('csvFormat.heading')}
            </h4>
            <p className="text-sm text-muted-foreground mb-2">
              {t('csvFormat.instructions')}
            </p>
            <code className="block bg-background p-2 rounded text-xs overflow-x-auto">
              customer_abn,product_sku,custom_price,effective_from,effective_to
              <br />
              12345678901,BEEF-RUMP-5KG,16.50,2025-01-01,2025-12-31
              <br />
              23456789012,BEEF-SCOTCH-5KG,21.50,2025-01-01,
            </code>
            <p className="text-xs text-muted-foreground mt-2">
              * {t('csvFormat.noteEffectiveDates')}
              <br />* {t('csvFormat.noteCustomerIdentifier')}
            </p>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('fields.uploadCsvFile')}
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="w-full px-3 py-2 border rounded-md file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>

          {/* CSV Preview */}
          {csvData && !importResult && (
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('fields.preview')}
              </label>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto max-h-32">
                {csvData.split('\n').slice(0, 5).join('\n')}
              </pre>
              <p className="text-sm text-muted-foreground mt-1">
                {t('fields.rowsToImport', { count: csvData.split('\n').length - 1 })}
              </p>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="bg-green-50 border border-green-200 p-3 rounded-md flex-1">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">
                      {t('results.successMessage', { count: importResult.success })}
                    </span>
                  </div>
                </div>

                {importResult.failed > 0 && (
                  <div className="bg-red-50 border border-red-200 p-3 rounded-md flex-1">
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium">
                        {t('results.failedMessage', { count: importResult.failed })}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Details */}
              {importResult.errors.length > 0 && (
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                  <h4 className="font-medium text-sm mb-2">{t('results.importErrors')}</h4>
                  <div className="space-y-1">
                    {importResult.errors.map((err, index) => (
                      <div key={index} className="text-sm text-muted-foreground">
                        {t('results.rowError', { row: err.row, error: err.error })}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importResult.failed === 0 && (
                <div className="text-center text-sm text-green-600">
                  {t('results.allSuccess')}
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            {importResult ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                >
                  {t('buttons.importMore')}
                </Button>
                <Button onClick={() => onOpenChange(false)}>
                  {t('buttons.close')}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={bulkImportMutation.isPending}
                >
                  {t('buttons.cancel')}
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={bulkImportMutation.isPending || !csvData}
                >
                  {bulkImportMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  <Upload className="h-4 w-4 mr-2" />
                  {t('buttons.importPricing')}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
