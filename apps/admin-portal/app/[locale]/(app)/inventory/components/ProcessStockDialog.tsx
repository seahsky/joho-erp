'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Badge,
} from '@joho-erp/ui';
import {
  Loader2,
  Package,
  ArrowRight,
  TrendingDown,
  AlertTriangle,
  Search,
  X,
} from 'lucide-react';
import { api } from '@/trpc/client';
import { useToast } from '@joho-erp/ui';
import { useTranslations } from 'next-intl';
import { parseToCents } from '@joho-erp/shared';

interface Product {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  unit: string;
  estimatedLossPercentage?: number | null;
}

interface ProcessStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceProduct?: Product | null;
  targetProduct?: Product | null;
  onSuccess: () => void;
}

export function ProcessStockDialog({
  open,
  onOpenChange,
  sourceProduct: initialSource,
  targetProduct: initialTarget,
  onSuccess,
}: ProcessStockDialogProps) {
  const { toast } = useToast();
  const t = useTranslations('processStock');
  const tCommon = useTranslations('common');

  // Product selection state
  const [sourceProduct, setSourceProduct] = useState<Product | null>(initialSource || null);
  const [targetProduct, setTargetProduct] = useState<Product | null>(initialTarget || null);
  const [productSearch, setProductSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectionMode, setSelectionMode] = useState<'source' | 'target' | 'none'>('none');

  // Sync with prop changes
  useEffect(() => {
    setSourceProduct(initialSource || null);
  }, [initialSource]);

  useEffect(() => {
    setTargetProduct(initialTarget || null);
  }, [initialTarget]);

  // Debounce product search (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(productSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  // Fetch products for selection
  const { data: productsData, isLoading: productsLoading } = api.product.getAll.useQuery(
    {
      search: debouncedSearch,
      status: 'active' as const,
      limit: 100,
    },
    { enabled: selectionMode !== 'none' && open }
  );

  // Form state
  const [quantityToProcess, setQuantityToProcess] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Calculate output quantity based on target's loss percentage
  const calculatedOutput = useMemo(() => {
    if (!quantityToProcess || !targetProduct) return 0;
    const qty = parseFloat(quantityToProcess) || 0;
    const lossPercentage = targetProduct.estimatedLossPercentage || 0;
    return parseFloat((qty * (1 - lossPercentage / 100)).toFixed(2));
  }, [quantityToProcess, targetProduct]);

  // Validation errors
  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    if (!sourceProduct) errors.push(t('validation.sourceRequired'));
    if (!targetProduct) errors.push(t('validation.targetRequired'));
    if (sourceProduct && targetProduct && sourceProduct.id === targetProduct.id) {
      errors.push(t('validation.sameProduct'));
    }

    const qty = parseFloat(quantityToProcess) || 0;
    if (qty <= 0) errors.push(t('validation.quantityPositive'));
    if (sourceProduct && qty > sourceProduct.currentStock) {
      errors.push(t('validation.insufficientStock'));
    }

    const cost = parseToCents(costPerUnit);
    if (!cost || cost <= 0) errors.push(t('validation.costRequired'));

    if (calculatedOutput <= 0) errors.push(t('validation.zeroOutput'));

    return errors;
  }, [sourceProduct, targetProduct, quantityToProcess, costPerUnit, calculatedOutput, t]);

  // Process stock mutation
  const processStockMutation = api.product.processStock.useMutation({
    onSuccess: (result) => {
      toast({
        title: t('messages.success'),
        description: t('messages.successDetails', {
          processed: result.quantityProcessed,
          produced: result.quantityProduced,
          sourceUnit: sourceProduct?.unit || '',
          targetUnit: targetProduct?.unit || '',
        }),
      });

      // Show expiry warnings if any
      if (result.expiryWarnings && result.expiryWarnings.length > 0) {
        toast({
          title: t('warnings.expiryTitle'),
          description: t('warnings.expiryMessage', {
            count: result.expiryWarnings.length,
          }),
          variant: 'destructive',
        });
      }

      handleReset();
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: t('messages.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sourceProduct || !targetProduct || validationErrors.length > 0) return;

    const costInCents = parseToCents(costPerUnit);
    if (!costInCents) return;

    await processStockMutation.mutateAsync({
      sourceProductId: sourceProduct.id,
      targetProductId: targetProduct.id,
      quantityToProcess: parseFloat(quantityToProcess),
      costPerUnit: costInCents,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      notes: notes.trim() || undefined,
    });
  };

  const handleReset = () => {
    setSourceProduct(null);
    setTargetProduct(null);
    setQuantityToProcess('');
    setCostPerUnit('');
    setExpiryDate('');
    setNotes('');
    setProductSearch('');
    setSelectionMode('none');
  };

  const handleProductSelect = (product: Product) => {
    if (selectionMode === 'source') {
      setSourceProduct(product);
    } else if (selectionMode === 'target') {
      setTargetProduct(product);
    }
    setSelectionMode('none');
    setProductSearch('');
  };

  const products = productsData?.items || [];
  const isLoading = processStockMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('dialog.title')}
          </DialogTitle>
          <DialogDescription>
            {t('dialog.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Selection Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">{t('fields.sourceProduct')}</h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Source Product */}
              <div>
                <Label>{t('fields.sourceProduct')}</Label>
                {sourceProduct ? (
                  <div className="mt-2 p-3 border rounded-md bg-muted/30">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{sourceProduct.name}</p>
                        <p className="text-sm text-muted-foreground">{sourceProduct.sku}</p>
                        <p className="text-sm mt-1">
                          {t('preview.source')}: <span className="font-medium">{sourceProduct.currentStock} {sourceProduct.unit}</span>
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSourceProduct(null);
                          setSelectionMode('source');
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => setSelectionMode('source')}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {t('dialog.selectSource')}
                  </Button>
                )}
              </div>

              {/* Target Product */}
              <div>
                <Label>{t('fields.targetProduct')}</Label>
                {targetProduct ? (
                  <div className="mt-2 p-3 border rounded-md bg-muted/30">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{targetProduct.name}</p>
                        <p className="text-sm text-muted-foreground">{targetProduct.sku}</p>
                        <p className="text-sm mt-1">
                          {t('preview.source')}: <span className="font-medium">{targetProduct.currentStock} {targetProduct.unit}</span>
                        </p>
                        {targetProduct.estimatedLossPercentage !== null && targetProduct.estimatedLossPercentage !== undefined && (
                          <p className="text-sm text-orange-600 mt-1">
                            {t('preview.loss')}: {targetProduct.estimatedLossPercentage}%
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setTargetProduct(null);
                          setSelectionMode('target');
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => setSelectionMode('target')}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {t('dialog.selectTarget')}
                  </Button>
                )}
              </div>
            </div>

            {/* Product Search Dropdown */}
            {selectionMode !== 'none' && (
              <div className="border rounded-md p-3 bg-muted/10">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={selectionMode === 'source' ? t('dialog.selectSource') : t('dialog.selectTarget')}
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectionMode('none');
                      setProductSearch('');
                    }}
                  >
                    {tCommon('cancel')}
                  </Button>
                </div>

                <div className="max-h-[200px] overflow-y-auto space-y-1">
                  {productsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : products.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No products found
                    </p>
                  ) : (
                    products.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        className="w-full text-left p-2 hover:bg-muted rounded-md transition-colors"
                        onClick={() => handleProductSelect(product as unknown as Product)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.sku}</p>
                          </div>
                          <Badge variant="secondary">
                            {('currentStock' in product) ? product.currentStock : 0} {product.unit}
                          </Badge>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Conversion Preview */}
          {sourceProduct && targetProduct && quantityToProcess && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <div className="text-sm text-muted-foreground">{t('preview.source')}</div>
                  <div className="text-2xl font-bold">{quantityToProcess} {sourceProduct.unit}</div>
                  <div className="text-sm">{sourceProduct.name}</div>
                </div>
                <div className="mx-4">
                  <ArrowRight className="h-8 w-8 text-blue-600" />
                </div>
                <div className="text-center flex-1">
                  <div className="text-sm text-muted-foreground">{t('preview.output')}</div>
                  <div className="text-2xl font-bold text-green-600">
                    {calculatedOutput.toFixed(2)} {targetProduct.unit}
                  </div>
                  <div className="text-sm">{targetProduct.name}</div>
                </div>
              </div>
              {targetProduct.estimatedLossPercentage && (
                <div className="mt-3 text-center text-sm text-muted-foreground">
                  <TrendingDown className="inline h-4 w-4 mr-1" />
                  {t('preview.loss')}: {targetProduct.estimatedLossPercentage}% =
                  {(parseFloat(quantityToProcess || '0') - calculatedOutput).toFixed(2)} {targetProduct.unit}
                </div>
              )}
            </div>
          )}

          {/* Form Fields */}
          {sourceProduct && targetProduct && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Processing Details</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantityToProcess">{t('fields.quantityToProcess')}</Label>
                  <Input
                    id="quantityToProcess"
                    type="number"
                    step="0.01"
                    value={quantityToProcess}
                    onChange={(e) => setQuantityToProcess(e.target.value)}
                    placeholder="0"
                    disabled={isLoading}
                  />
                  {sourceProduct && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Available: {sourceProduct.currentStock} {sourceProduct.unit}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="costPerUnit">{t('fields.costPerUnit')}</Label>
                  <Input
                    id="costPerUnit"
                    type="text"
                    value={costPerUnit}
                    onChange={(e) => setCostPerUnit(e.target.value)}
                    placeholder="25.50"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('fields.costPerUnitHint')}
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="expiryDate">{t('fields.expiryDate')}</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="notes">{t('fields.notes')}</Label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                  placeholder={t('fields.notesPlaceholder')}
                  rows={3}
                  className="mt-1 w-full px-3 py-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">Please fix the following errors:</p>
                  <ul className="text-sm text-red-700 list-disc list-inside mt-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                handleReset();
                onOpenChange(false);
              }}
              disabled={isLoading}
            >
              {tCommon('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isLoading || validationErrors.length > 0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('buttons.processing')}
                </>
              ) : (
                t('buttons.processStock')
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
