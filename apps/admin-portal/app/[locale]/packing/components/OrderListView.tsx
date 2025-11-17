'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@jimmy-beef/ui';
import { useTranslations } from 'next-intl';
import { Package, Filter } from 'lucide-react';
import { PackingOrderCard } from './PackingOrderCard';

interface OrderListViewProps {
  orders: Array<{
    orderId: string;
    orderNumber: string;
    customerName: string;
    areaTag: string;
  }>;
  deliveryDate: Date;
  onOrderUpdated: () => void;
}

export function OrderListView({ orders, deliveryDate, onOrderUpdated }: OrderListViewProps) {
  const t = useTranslations('packing');
  const [areaFilter, setAreaFilter] = useState<string>('');

  // Get unique area tags
  const areaTags = Array.from(new Set(orders.map((o) => o.areaTag))).sort();

  // Filter orders by area
  const filteredOrders = areaFilter
    ? orders.filter((o) => o.areaTag === areaFilter)
    : orders;

  // Group orders by area
  const ordersByArea = filteredOrders.reduce((acc, order) => {
    if (!acc[order.areaTag]) {
      acc[order.areaTag] = [];
    }
    acc[order.areaTag].push(order);
    return acc;
  }, {} as Record<string, typeof orders>);

  const getAreaBadgeColor = (areaTag: string) => {
    switch (areaTag.toLowerCase()) {
      case 'north':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'south':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'east':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'west':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with filter */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {t('orderByOrder')}
              </CardTitle>
              <CardDescription>
                {t('orderByOrderDescription')} ({filteredOrders.length} {t('orders')})
              </CardDescription>
            </div>

            {/* Area Filter */}
            {areaTags.length > 1 && (
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={areaFilter === '' ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setAreaFilter('')}
                  >
                    {t('allAreas')}
                  </Badge>
                  {areaTags.map((area) => (
                    <Badge
                      key={area}
                      className={`cursor-pointer ${
                        areaFilter === area
                          ? getAreaBadgeColor(area)
                          : 'bg-transparent border-2'
                      }`}
                      onClick={() => setAreaFilter(area)}
                    >
                      {area.toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Orders grouped by area using Accordion */}
      <Accordion type="multiple" className="space-y-4">
        {Object.entries(ordersByArea)
          .sort(([areaA], [areaB]) => areaA.localeCompare(areaB))
          .map(([area, areaOrders]) => (
            <AccordionItem key={area} value={area} className="border rounded-lg">
              <AccordionTrigger className="px-6 hover:no-underline">
                <div className="flex items-center gap-3">
                  <Badge className={getAreaBadgeColor(area)}>
                    {area.toUpperCase()}
                  </Badge>
                  <span className="font-medium">
                    {areaOrders.length} {areaOrders.length === 1 ? t('order') : t('orders')}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 pt-2">
                <div className="space-y-4">
                  {areaOrders.map((order) => (
                    <PackingOrderCard
                      key={order.orderId}
                      order={order}
                      onOrderUpdated={onOrderUpdated}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
      </Accordion>

      {filteredOrders.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t('noOrdersForArea')}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
