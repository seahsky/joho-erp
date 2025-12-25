'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ResponsiveTable,
  type TableColumn,
} from '@joho-erp/ui';
import { Package } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatAUD } from '@joho-erp/shared';

interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unit: string;
  unitPrice: number; // in cents
}

interface OrderItemsTableProps {
  items: OrderItem[];
  subtotal: number; // in cents
  taxAmount: number; // in cents
  totalAmount: number; // in cents
}

export function OrderItemsTable({
  items,
  subtotal,
  taxAmount,
  totalAmount,
}: OrderItemsTableProps) {
  const t = useTranslations('orderDetail');

  const columns: TableColumn<OrderItem>[] = [
    {
      key: 'sku',
      label: t('items.sku'),
      className: 'font-mono text-sm',
    },
    {
      key: 'productName',
      label: t('items.product'),
      className: 'font-medium',
    },
    {
      key: 'quantity',
      label: t('items.quantity'),
      className: 'text-center',
      render: (item) => `${item.quantity} ${item.unit}`,
    },
    {
      key: 'unitPrice',
      label: t('items.unitPrice'),
      className: 'text-right',
      render: (item) => formatAUD(item.unitPrice),
    },
    {
      key: 'subtotal',
      label: t('items.subtotal'),
      className: 'text-right font-medium',
      render: (item) => formatAUD(item.quantity * item.unitPrice),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          {t('items.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveTable data={items} columns={columns} />

        {/* Totals Section */}
        <div className="mt-6 border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('totals.subtotal')}</span>
            <span>{formatAUD(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('totals.tax')}</span>
            <span>{formatAUD(taxAmount)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>{t('totals.total')}</span>
            <span>{formatAUD(totalAmount)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
