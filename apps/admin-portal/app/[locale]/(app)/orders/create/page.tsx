'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
} from '@joho-erp/ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { api } from '@/trpc/client';
import { formatAUD } from '@joho-erp/shared';
import {
  ShoppingCart,
  Plus,
  X,
  AlertCircle,
  Loader2,
  MapPin,
  FileText,
  Shield,
} from 'lucide-react';
import { useToast } from '@joho-erp/ui';

type OrderItem = {
  productId: string;
  quantity: number;
  sku: string;
  name: string;
  unitPrice: number; // In cents
  subtotal: number; // In cents
};

export default function CreateOrderOnBehalfPage() {
  const t = useTranslations('orderOnBehalf');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { toast } = useToast();

  // State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Address
  const [useCustomAddress, setUseCustomAddress] = useState(false);
  const [customStreet, setCustomStreet] = useState('');
  const [customSuburb, setCustomSuburb] = useState('');
  const [customState, setCustomState] = useState('');
  const [customPostcode, setCustomPostcode] = useState('');
  const [customAreaTag, setCustomAreaTag] = useState<'north' | 'south' | 'east' | 'west'>('north');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  // Bypass options
  const [bypassCreditLimit, setBypassCreditLimit] = useState(false);
  const [bypassCreditReason, setBypassCreditReason] = useState('');
  const [bypassCutoffTime, setBypassCutoffTime] = useState(false);

  // Notes
  const [adminNotes, setAdminNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // Delivery date
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState('');

  // Fetch data
  const { data: customersData } = api.customer.getAll.useQuery({ limit: 1000 });
  const { data: productsData } = api.product.getAll.useQuery({});
  const { data: selectedCustomer } = api.customer.getById.useQuery(
    { customerId: selectedCustomerId },
    { enabled: !!selectedCustomerId }
  );

  const customers = customersData?.customers || [];
  const products = productsData?.items || [];

  // Create order mutation
  const createOrderMutation = api.order.createOnBehalf.useMutation({
    onSuccess: (data) => {
      toast({
        title: t('messages.orderCreated'),
        description: t('messages.orderCreatedSuccess', { orderNumber: data.orderNumber }),
        variant: 'default',
      });
      router.push(`/orders`);
    },
    onError: (error) => {
      toast({
        title: t('messages.orderFailed'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Calculate totals
  const { subtotal, gst, total } = useMemo(() => {
    const subtotalCents = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const gstCents = Math.round(subtotalCents * 0.1);
    const totalCents = subtotalCents + gstCents;
    return {
      subtotal: subtotalCents,
      gst: gstCents,
      total: totalCents,
    };
  }, [orderItems]);

  // Credit limit check
  const exceedsCreditLimit = useMemo(() => {
    if (!selectedCustomer || bypassCreditLimit) return false;
    return total > (selectedCustomer.creditApplication.creditLimit || 0);
  }, [total, selectedCustomer, bypassCreditLimit]);

  // Add item to order
  const handleAddItem = () => {
    if (!selectedProductId || quantity <= 0) {
      toast({
        title: t('validation.invalidItem'),
        description: t('validation.selectProductAndQuantity'),
        variant: 'destructive',
      });
      return;
    }

    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;

    // Check if product already in order
    const existingIndex = orderItems.findIndex((item) => item.productId === selectedProductId);

    if (existingIndex >= 0) {
      // Update quantity
      const updatedItems = [...orderItems];
      const newQuantity = updatedItems[existingIndex].quantity + quantity;
      updatedItems[existingIndex] = {
        ...updatedItems[existingIndex],
        quantity: newQuantity,
        subtotal: product.basePrice * newQuantity,
      };
      setOrderItems(updatedItems);
    } else {
      // Add new item
      const newItem: OrderItem = {
        productId: product.id,
        quantity,
        sku: product.sku,
        name: product.name,
        unitPrice: product.basePrice, // In cents
        subtotal: product.basePrice * quantity,
      };
      setOrderItems([...orderItems, newItem]);
    }

    // Reset
    setSelectedProductId('');
    setQuantity(1);
  };

  // Remove item
  const handleRemoveItem = (productId: string) => {
    setOrderItems(orderItems.filter((item) => item.productId !== productId));
  };

  // Submit order
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!selectedCustomerId) {
      toast({
        title: t('validation.customerRequired'),
        variant: 'destructive',
      });
      return;
    }

    if (orderItems.length === 0) {
      toast({
        title: t('validation.itemsRequired'),
        variant: 'destructive',
      });
      return;
    }

    if (bypassCreditLimit && !bypassCreditReason.trim()) {
      toast({
        title: t('validation.bypassReasonRequired'),
        variant: 'destructive',
      });
      return;
    }

    if (useCustomAddress && (!customStreet || !customSuburb || !customState || !customPostcode)) {
      toast({
        title: t('validation.customAddressRequired'),
        variant: 'destructive',
      });
      return;
    }

    // Prepare payload
    const payload = {
      customerId: selectedCustomerId,
      items: orderItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      useCustomAddress,
      customDeliveryAddress: useCustomAddress
        ? {
            street: customStreet,
            suburb: customSuburb,
            state: customState,
            postcode: customPostcode,
            areaTag: customAreaTag,
            deliveryInstructions: deliveryInstructions || undefined,
          }
        : undefined,
      bypassCreditLimit,
      bypassCreditReason: bypassCreditReason || undefined,
      bypassCutoffTime,
      adminNotes: adminNotes || undefined,
      internalNotes: internalNotes || undefined,
      requestedDeliveryDate: requestedDeliveryDate ? new Date(requestedDeliveryDate) : undefined,
    };

    createOrderMutation.mutate(payload);
  };

  return (
    <div className="container mx-auto px-4 py-6 md:py-10 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-4xl font-bold">{t('title')}</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              {t('sections.customerSelection')}
            </CardTitle>
            <CardDescription>{t('sections.customerDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="customer">{t('fields.customer')}</Label>
              <select
                id="customer"
                className="w-full px-3 py-2 border rounded-md mt-1"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                required
              >
                <option value="">{t('placeholders.selectCustomer')}</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.businessName} ({customer.contactPerson.email})
                  </option>
                ))}
              </select>
            </div>

            {selectedCustomer && (
              <div className="mt-4 p-4 bg-muted rounded-md">
                <p className="text-sm font-medium">{t('info.creditLimit')}</p>
                <p className="text-2xl font-bold">
                  {formatAUD(selectedCustomer.creditApplication.creditLimit)}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t('info.deliveryArea')}: {selectedCustomer.deliveryAddress.areaTag.toUpperCase()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Selection */}
        {selectedCustomerId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                {t('sections.addProducts')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="product">{t('fields.product')}</Label>
                  <select
                    id="product"
                    className="w-full px-3 py-2 border rounded-md mt-1"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                  >
                    <option value="">{t('placeholders.selectProduct')}</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.sku} - {product.name} ({formatAUD(product.basePrice)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="quantity">{t('fields.quantity')}</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="mt-1"
                  />
                </div>
              </div>
              <Button type="button" onClick={handleAddItem} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                {t('buttons.addItem')}
              </Button>

              {/* Order Items Table */}
              {orderItems.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">{t('sections.orderItems')}</h3>
                  <div className="space-y-2">
                    {orderItems.map((item) => (
                      <div
                        key={item.productId}
                        className="flex items-center justify-between p-3 bg-muted rounded-md"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} × {formatAUD(item.unitPrice)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="font-semibold">{formatAUD(item.subtotal)}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item.productId)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="mt-4 p-4 bg-muted rounded-md space-y-2">
                    <div className="flex justify-between">
                      <span>{tCommon('subtotal')}</span>
                      <span className="font-medium">{formatAUD(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{tCommon('tax')}</span>
                      <span className="font-medium">{formatAUD(gst)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-bold">{tCommon('total')}</span>
                      <span className="font-bold text-lg">{formatAUD(total)}</span>
                    </div>

                    {exceedsCreditLimit && !bypassCreditLimit && (
                      <div className="flex items-center gap-2 text-destructive mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">{t('warnings.exceedsCreditLimit')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Delivery Options */}
        {orderItems.length > 0 && (
          <>
            {/* Custom Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {t('sections.deliveryAddress')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="useCustomAddress"
                    checked={useCustomAddress}
                    onChange={(e) => setUseCustomAddress(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="useCustomAddress" className="cursor-pointer">
                    {t('fields.useCustomAddress')}
                  </Label>
                </div>

                {useCustomAddress && (
                  <div className="space-y-4 pl-6 border-l-2">
                    <div>
                      <Label>{t('fields.street')}</Label>
                      <Input
                        value={customStreet}
                        onChange={(e) => setCustomStreet(e.target.value)}
                        placeholder={t('placeholders.street')}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{t('fields.suburb')}</Label>
                        <Input
                          value={customSuburb}
                          onChange={(e) => setCustomSuburb(e.target.value)}
                          placeholder={t('placeholders.suburb')}
                        />
                      </div>
                      <div>
                        <Label>{t('fields.state')}</Label>
                        <Input
                          value={customState}
                          onChange={(e) => setCustomState(e.target.value)}
                          placeholder="NSW"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{t('fields.postcode')}</Label>
                        <Input
                          value={customPostcode}
                          onChange={(e) => setCustomPostcode(e.target.value)}
                          placeholder="2000"
                        />
                      </div>
                      <div>
                        <Label>{t('fields.areaTag')}</Label>
                        <select
                          className="w-full px-3 py-2 border rounded-md"
                          value={customAreaTag}
                          onChange={(e) =>
                            setCustomAreaTag(e.target.value as 'north' | 'south' | 'east' | 'west')
                          }
                        >
                          <option value="north">{t('areas.north')}</option>
                          <option value="south">{t('areas.south')}</option>
                          <option value="east">{t('areas.east')}</option>
                          <option value="west">{t('areas.west')}</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <Label>{t('fields.deliveryInstructions')}</Label>
                      <textarea
                        value={deliveryInstructions}
                        onChange={(e) => setDeliveryInstructions(e.target.value)}
                        placeholder={t('placeholders.deliveryInstructions')}
                        rows={2}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                  </div>
                )}

                {!useCustomAddress && selectedCustomer && (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">{t('info.usingDefaultAddress')}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedCustomer.deliveryAddress.street},{' '}
                      {selectedCustomer.deliveryAddress.suburb}
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="deliveryDate">{t('fields.deliveryDate')}</Label>
                  <Input
                    id="deliveryDate"
                    type="date"
                    value={requestedDeliveryDate}
                    onChange={(e) => setRequestedDeliveryDate(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('info.deliveryDateOptional')}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Bypass Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {t('sections.adminOptions')}
                </CardTitle>
                <CardDescription>{t('sections.adminOptionsDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Bypass Credit Limit */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="bypassCredit"
                      checked={bypassCreditLimit}
                      onChange={(e) => setBypassCreditLimit(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="bypassCredit" className="cursor-pointer">
                      {t('fields.bypassCreditLimit')}
                    </Label>
                  </div>
                  {bypassCreditLimit && (
                    <div className="pl-6">
                      <Label>{t('fields.bypassReason')}</Label>
                      <textarea
                        value={bypassCreditReason}
                        onChange={(e) => setBypassCreditReason(e.target.value)}
                        placeholder={t('placeholders.bypassReason')}
                        rows={2}
                        required
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                  )}
                </div>

                {/* Bypass Cutoff Time */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="bypassCutoff"
                    checked={bypassCutoffTime}
                    onChange={(e) => setBypassCutoffTime(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="bypassCutoff" className="cursor-pointer">
                    {t('fields.bypassCutoffTime')}
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t('sections.notes')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>{t('fields.adminNotes')}</Label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder={t('placeholders.adminNotes')}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('info.adminNotesPrivate')}
                  </p>
                </div>
                <div>
                  <Label>{t('fields.internalNotes')}</Label>
                  <textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder={t('placeholders.internalNotes')}
                    rows={2}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/orders')}
                disabled={createOrderMutation.isPending}
              >
                {tCommon('cancel')}
              </Button>
              <Button
                type="submit"
                disabled={createOrderMutation.isPending || orderItems.length === 0}
              >
                {createOrderMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {t('buttons.createOrder')}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
