'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@joho-erp/ui';
import { useTranslations } from 'next-intl';
import { formatAUD } from '@joho-erp/shared';
import { StockShortfallPanel, type StockShortfallItem } from './StockShortfallPanel';
import { Loader2 } from 'lucide-react';

type ApprovalType = 'approve_all' | 'reject' | 'partial';

export interface BackorderOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  requestedDeliveryDate: Date;
  items: Array<{
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unit: string;
    unitPrice: number;
  }>;
  stockShortfall: Record<
    string,
    {
      requested: number;
      available: number;
      shortfall: number;
    }
  >;
}

export interface BackorderApprovalDialogProps {
  order: BackorderOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (data: {
    orderId: string;
    approvedQuantities?: Record<string, number>;
    estimatedFulfillment?: Date;
    notes?: string;
    bypassStockCheck?: boolean;
  }) => Promise<void>;
  onReject: (data: { orderId: string; reason: string }) => Promise<void>;
  isSubmitting?: boolean;
}

export function BackorderApprovalDialog({
  order,
  open,
  onOpenChange,
  onApprove,
  onReject,
  isSubmitting = false,
}: BackorderApprovalDialogProps) {
  const t = useTranslations('orders.backorderDialog');
  const tValidation = useTranslations('orders.backorderValidation');

  const [approvalType, setApprovalType] = useState<ApprovalType>('approve_all');
  const [approvedQuantities, setApprovedQuantities] = useState<Record<string, number>>({});
  const [estimatedFulfillment, setEstimatedFulfillment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [bypassStockCheck, setBypassStockCheck] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!order) return null;

  // Build stock shortfall items for the panel
  const shortfallItems: StockShortfallItem[] = Object.entries(order.stockShortfall).map(
    ([productId, shortfall]) => {
      const item = order.items.find((i) => i.productId === productId);
      return {
        productId,
        productName: item?.productName || 'Unknown Product',
        sku: item?.sku || '',
        requested: shortfall.requested,
        available: shortfall.available,
        shortfall: shortfall.shortfall,
        unit: item?.unit || '',
      };
    }
  );

  // Initialize approved quantities with available stock
  const initializeApprovedQuantities = () => {
    const quantities: Record<string, number> = {};
    Object.entries(order.stockShortfall).forEach(([productId, shortfall]) => {
      quantities[productId] = shortfall.available;
    });
    setApprovedQuantities(quantities);
  };

  // Handle approval type change
  const handleApprovalTypeChange = (value: ApprovalType) => {
    setApprovalType(value);
    setErrors({});

    if (value === 'partial' && Object.keys(approvedQuantities).length === 0) {
      initializeApprovedQuantities();
    }
  };

  // Handle quantity change for partial approval
  const handleQuantityChange = (productId: string, value: string) => {
    const quantity = parseInt(value);
    if (isNaN(quantity) || quantity < 0) {
      setApprovedQuantities((prev) => ({ ...prev, [productId]: 0 }));
      return;
    }

    const shortfall = order.stockShortfall[productId];
    if (quantity > shortfall.requested) {
      setErrors((prev) => ({
        ...prev,
        [productId]: tValidation('quantityExceedsAvailable'),
      }));
      return;
    }

    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[productId];
      return newErrors;
    });

    setApprovedQuantities((prev) => ({ ...prev, [productId]: quantity }));
  };

  // Validate and submit
  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};

    if (approvalType === 'reject') {
      if (rejectionReason.trim().length < 10) {
        newErrors.rejectionReason = tValidation('rejectionReasonRequired');
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      await onReject({
        orderId: order.id,
        reason: rejectionReason,
      });
    } else {
      // Validate partial quantities
      if (approvalType === 'partial') {
        Object.keys(order.stockShortfall).forEach((productId) => {
          const qty = approvedQuantities[productId];
          if (qty === undefined || qty <= 0) {
            newErrors[productId] = tValidation('quantityPositive');
          }
        });

        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
          return;
        }
      }

      await onApprove({
        orderId: order.id,
        approvedQuantities: approvalType === 'partial' ? approvedQuantities : undefined,
        estimatedFulfillment: estimatedFulfillment ? new Date(estimatedFulfillment) : undefined,
        notes: adminNotes || undefined,
        bypassStockCheck,
      });
    }

    // Reset form
    setApprovalType('approve_all');
    setApprovedQuantities({});
    setEstimatedFulfillment('');
    setRejectionReason('');
    setAdminNotes('');
    setBypassStockCheck(false);
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('orderDetails')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{t('orderNumber')}</p>
                  <p className="font-medium">{order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('customer')}</p>
                  <p className="font-medium">{order.customerName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('requestedDate')}</p>
                  <p className="font-medium">
                    {new Date(order.requestedDeliveryDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('totalAmount')}</p>
                  <p className="font-medium">{formatAUD(order.totalAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stock Availability */}
          <StockShortfallPanel items={shortfallItems} />

          {/* Stock bypass warning for full approval */}
          {approvalType === 'approve_all' && shortfallItems.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
              <div className="flex items-start gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    {t('stockWarning')}
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bypassStockCheck}
                      onChange={(e) => setBypassStockCheck(e.target.checked)}
                      className="h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-sm text-amber-700 dark:text-amber-300">
                      {t('bypassStockCheck')}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Approval Decision */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('approvalDecision')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {/* Approve All */}
                <button
                  type="button"
                  onClick={() => handleApprovalTypeChange('approve_all')}
                  className={`w-full text-left rounded-md border p-4 transition-colors ${
                    approvalType === 'approve_all'
                      ? 'border-primary bg-primary/5'
                      : 'border-input hover:bg-muted/50'
                  }`}
                >
                  <div className="flex-1">
                    <p className="font-medium">{t('approveAll')}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('approveAllDescription')}
                    </p>
                  </div>
                </button>

                {/* Partial Approval */}
                <div>
                  <button
                    type="button"
                    onClick={() => handleApprovalTypeChange('partial')}
                    className={`w-full text-left rounded-md border p-4 transition-colors ${
                      approvalType === 'partial'
                        ? 'border-primary bg-primary/5'
                        : 'border-input hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{t('partialApproval')}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('partialApprovalDescription')}
                      </p>
                    </div>
                  </button>

                  {approvalType === 'partial' && (
                    <div className="space-y-3 mt-4 pl-4 border-l-2 border-muted">
                      {shortfallItems.map((item) => (
                        <div key={item.productId} className="space-y-2">
                          <Label className="text-sm font-normal">
                            {item.productName} ({item.sku})
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max={item.requested}
                              value={approvedQuantities[item.productId] || ''}
                              onChange={(e) =>
                                handleQuantityChange(item.productId, e.target.value)
                              }
                              className="w-32"
                              placeholder="0"
                            />
                            <span className="text-sm text-muted-foreground">
                              / {item.requested} {item.unit}
                            </span>
                          </div>
                          {errors[item.productId] && (
                            <p className="text-sm text-destructive">{errors[item.productId]}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reject */}
                <div>
                  <button
                    type="button"
                    onClick={() => handleApprovalTypeChange('reject')}
                    className={`w-full text-left rounded-md border p-4 transition-colors ${
                      approvalType === 'reject'
                        ? 'border-primary bg-primary/5'
                        : 'border-input hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{t('rejectAll')}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('rejectAllDescription')}
                      </p>
                    </div>
                  </button>

                  {approvalType === 'reject' && (
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="rejectionReason">{t('rejectionReason')}</Label>
                      <textarea
                        id="rejectionReason"
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder={t('rejectionReasonPlaceholder')}
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                      />
                      {errors.rejectionReason && (
                        <p className="text-sm text-destructive">{errors.rejectionReason}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Estimated Fulfillment (for approvals) */}
              {approvalType !== 'reject' && (
                <div className="space-y-2">
                  <Label htmlFor="estimatedFulfillment">{t('estimatedFulfillment')}</Label>
                  <Input
                    id="estimatedFulfillment"
                    type="date"
                    value={estimatedFulfillment}
                    onChange={(e) => setEstimatedFulfillment(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    placeholder={t('estimatedFulfillmentPlaceholder')}
                  />
                </div>
              )}

              {/* Admin Notes */}
              <div className="space-y-2">
                <Label htmlFor="adminNotes">{t('adminNotes')}</Label>
                <textarea
                  id="adminNotes"
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder={t('adminNotesPlaceholder')}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {approvalType === 'reject'
              ? isSubmitting
                ? t('rejecting')
                : t('reject')
              : approvalType === 'partial'
              ? isSubmitting
                ? t('approving')
                : t('approvePartial')
              : isSubmitting
              ? t('approving')
              : t('approve')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

BackorderApprovalDialog.displayName = 'BackorderApprovalDialog';
