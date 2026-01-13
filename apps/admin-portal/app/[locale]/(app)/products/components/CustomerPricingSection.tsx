'use client';

import { useState, useMemo } from 'react';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  Button,
  Input,
  Label,
  Badge,
} from '@joho-erp/ui';
import {
  DollarSign,
  Search,
  Percent,
  Tag,
  CheckSquare,
  Square,
} from 'lucide-react';
import { formatAUD } from '@joho-erp/shared';
import { useToast } from '@joho-erp/ui';
import { useTranslations } from 'next-intl';

type Customer = {
  id: string;
  businessName: string;
  deliveryAddress?: {
    area?: string;
  };
};

export type PricingEntry = {
  enabled: boolean;
  customPrice: number; // In dollars for display
};

interface CustomerPricingSectionProps {
  pricingMap: Map<string, PricingEntry>;
  onPricingMapChange: (newMap: Map<string, PricingEntry>) => void;
  basePrice: string; // Dollar string for discount calculations
  customers: Customer[];
  disabled?: boolean;
  defaultExpanded?: boolean;
}

export function CustomerPricingSection({
  pricingMap,
  onPricingMapChange,
  basePrice,
  customers,
  disabled = false,
  defaultExpanded = false,
}: CustomerPricingSectionProps) {
  const { toast } = useToast();
  const t = useTranslations('productForm');

  // Local UI state
  const [customerSearch, setCustomerSearch] = useState('');
  const [bulkDiscountPercent, setBulkDiscountPercent] = useState('');
  const [bulkDiscountAmount, setBulkDiscountAmount] = useState('');
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  // Filter and search customers
  const filteredCustomers = useMemo(() => {
    let filtered = customers;

    // Search filter
    if (customerSearch) {
      filtered = filtered.filter((c) =>
        c.businessName.toLowerCase().includes(customerSearch.toLowerCase())
      );
    }

    // Show only selected filter
    if (showOnlySelected) {
      filtered = filtered.filter((c) => pricingMap.get(c.id)?.enabled);
    }

    return filtered;
  }, [customers, customerSearch, showOnlySelected, pricingMap]);

  // Calculate total savings and selected count
  const { selectedCount, totalSavings } = useMemo(() => {
    let count = 0;
    let savings = 0;
    const bp = parseFloat(basePrice) || 0;

    pricingMap.forEach((entry) => {
      if (entry.enabled && entry.customPrice > 0) {
        count++;
        const discount = bp - entry.customPrice;
        if (discount > 0) savings += discount;
      }
    });

    return { selectedCount: count, totalSavings: savings };
  }, [pricingMap, basePrice]);

  const handleTogglePricing = (customerId: string) => {
    const newMap = new Map(pricingMap);
    const current = newMap.get(customerId);

    if (current) {
      newMap.set(customerId, { ...current, enabled: !current.enabled });
    } else {
      newMap.set(customerId, { enabled: true, customPrice: parseFloat(basePrice) || 0 });
    }

    onPricingMapChange(newMap);
  };

  const handlePriceChange = (customerId: string, price: string) => {
    const newMap = new Map(pricingMap);
    const current = newMap.get(customerId) || { enabled: true, customPrice: 0 };
    newMap.set(customerId, { ...current, customPrice: parseFloat(price) || 0 });
    onPricingMapChange(newMap);
  };

  const handleApplyPercentDiscount = () => {
    const percent = parseFloat(bulkDiscountPercent);
    const bp = parseFloat(basePrice);

    if (isNaN(percent) || isNaN(bp) || bp <= 0) {
      toast({
        title: t('validation.invalidInput'),
        description: t('validation.invalidPercentAndPrice'),
        variant: 'destructive',
      });
      return;
    }

    const newMap = new Map(pricingMap);
    filteredCustomers.forEach((customer) => {
      const current = newMap.get(customer.id);
      if (current?.enabled || !newMap.has(customer.id)) {
        const discountedPrice = bp * (1 - percent / 100);
        newMap.set(customer.id, { enabled: true, customPrice: discountedPrice });
      }
    });

    onPricingMapChange(newMap);
    setBulkDiscountPercent('');
    toast({
      title: t('messages.discountApplied'),
      description: t('messages.percentDiscountApplied', {
        percent: percent,
        count: filteredCustomers.length
      }),
    });
  };

  const handleApplyAmountDiscount = () => {
    const amount = parseFloat(bulkDiscountAmount);
    const bp = parseFloat(basePrice);

    if (isNaN(amount) || isNaN(bp) || bp <= 0) {
      toast({
        title: t('validation.invalidInput'),
        description: t('validation.invalidAmountAndPrice'),
        variant: 'destructive',
      });
      return;
    }

    const newMap = new Map(pricingMap);
    filteredCustomers.forEach((customer) => {
      const current = newMap.get(customer.id);
      if (current?.enabled || !newMap.has(customer.id)) {
        const discountedPrice = Math.max(0, bp - amount);
        newMap.set(customer.id, { enabled: true, customPrice: discountedPrice });
      }
    });

    onPricingMapChange(newMap);
    setBulkDiscountAmount('');
    toast({
      title: t('messages.discountApplied'),
      description: t('messages.amountDiscountApplied', {
        amount: amount.toFixed(2),
        count: filteredCustomers.length
      }),
    });
  };

  const handleClearAllPricing = () => {
    onPricingMapChange(new Map());
    toast({
      title: t('messages.pricingCleared'),
      description: t('messages.pricingClearedDescription'),
    });
  };

  const calculateDiscount = (customPrice: number) => {
    const bp = parseFloat(basePrice);
    if (isNaN(bp) || bp <= 0) return { amount: 0, percent: 0 };

    const discount = bp - customPrice;
    const percent = (discount / bp) * 100;
    return { amount: discount, percent };
  };

  return (
    <Accordion type="single" collapsible defaultValue={defaultExpanded ? 'pricing' : undefined}>
      <AccordionItem value="pricing">
        <AccordionTrigger className="text-sm font-semibold">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            {t('sections.customerPricing')}
            {selectedCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedCount} {t(selectedCount === 1 ? 'pricing.oneCustomer' : 'pricing.customers')}
              </Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 pt-2">
            {/* Bulk Actions */}
            <div className="bg-muted p-3 rounded-md space-y-3">
              <h4 className="text-sm font-medium">{t('bulkActions.title')}</h4>

              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label htmlFor="bulkPercent" className="text-xs">{t('bulkActions.applyPercentDiscount')}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="bulkPercent"
                      type="number"
                      step="0.1"
                      value={bulkDiscountPercent}
                      onChange={(e) => setBulkDiscountPercent(e.target.value)}
                      placeholder={t('bulkActions.percentPlaceholder')}
                      className="w-24"
                      disabled={disabled}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleApplyPercentDiscount}
                      disabled={!bulkDiscountPercent || !basePrice || disabled}
                    >
                      <Percent className="h-4 w-4 mr-1" />
                      {t('bulkActions.apply')}
                    </Button>
                  </div>
                </div>

                <div className="flex-1">
                  <Label htmlFor="bulkAmount" className="text-xs">{t('bulkActions.applyAmountDiscount')}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="bulkAmount"
                      type="number"
                      step="0.01"
                      value={bulkDiscountAmount}
                      onChange={(e) => setBulkDiscountAmount(e.target.value)}
                      placeholder={t('bulkActions.amountPlaceholder')}
                      className="w-24"
                      disabled={disabled}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleApplyAmountDiscount}
                      disabled={!bulkDiscountAmount || !basePrice || disabled}
                    >
                      <DollarSign className="h-4 w-4 mr-1" />
                      {t('bulkActions.apply')}
                    </Button>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleClearAllPricing}
                  disabled={selectedCount === 0 || disabled}
                >
                  {t('bulkActions.clearAll')}
                </Button>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{selectedCount} {t('pricing.selected')}</span>
                {totalSavings > 0 && (
                  <span className="text-green-600 font-medium">
                    {t('pricing.totalSavings')}: {formatAUD(totalSavings)}
                  </span>
                )}
              </div>
            </div>

            {/* Search & Filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('pricing.searchPlaceholder')}
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="pl-10"
                  disabled={disabled}
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant={showOnlySelected ? 'default' : 'outline'}
                onClick={() => setShowOnlySelected(!showOnlySelected)}
                disabled={disabled}
              >
                <Tag className="h-4 w-4 mr-1" />
                {t('pricing.selectedOnly')}
              </Button>
            </div>

            {/* Customer Pricing Table */}
            <div className="border rounded-md max-h-[300px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2 w-12"></th>
                    <th className="text-left p-2">{t('pricing.customer')}</th>
                    <th className="text-right p-2">{t('pricing.basePrice')}</th>
                    <th className="text-right p-2">{t('pricing.customPrice')}</th>
                    <th className="text-right p-2">{t('pricing.savings')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center p-4 text-muted-foreground">
                        {t('pricing.noCustomersFound')}
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((customer) => {
                      const pricing = pricingMap.get(customer.id);
                      const isEnabled = pricing?.enabled || false;
                      const customPrice = pricing?.customPrice || parseFloat(basePrice) || 0;
                      const { amount, percent } = calculateDiscount(customPrice);

                      return (
                        <tr key={customer.id} className="border-t hover:bg-muted/50">
                          <td className="p-2">
                            <button
                              type="button"
                              onClick={() => handleTogglePricing(customer.id)}
                              className="hover:text-primary"
                              disabled={disabled}
                            >
                              {isEnabled ? (
                                <CheckSquare className="h-4 w-4" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                          <td className="p-2">
                            <div className="font-medium">{customer.businessName}</div>
                            {customer.deliveryAddress?.area && (
                              <div className="text-xs text-muted-foreground">
                                {customer.deliveryAddress.area}
                              </div>
                            )}
                          </td>
                          <td className="text-right p-2 text-muted-foreground">
                            {basePrice ? `$${parseFloat(basePrice).toFixed(2)}` : '-'}
                          </td>
                          <td className="text-right p-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={isEnabled ? customPrice : ''}
                              onChange={(e) => handlePriceChange(customer.id, e.target.value)}
                              placeholder={basePrice || '0.00'}
                              disabled={!isEnabled || disabled}
                              className="w-24 text-right"
                            />
                          </td>
                          <td className="text-right p-2">
                            {isEnabled && amount !== 0 ? (
                              <div className={amount > 0 ? 'text-green-600' : 'text-red-600'}>
                                <div className="font-medium">
                                  {amount > 0 ? '-' : '+'}${Math.abs(amount).toFixed(2)}
                                </div>
                                <div className="text-xs">
                                  ({percent.toFixed(1)}%)
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
