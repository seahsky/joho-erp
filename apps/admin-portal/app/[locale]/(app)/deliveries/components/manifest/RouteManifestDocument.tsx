import { Document, Page, View } from '@react-pdf/renderer';
import { styles } from './manifest-styles';
import { ManifestSummaryPage } from './ManifestSummaryPage';
import { ManifestStopPage } from './ManifestStopPage';

interface StopItem {
  sku: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPriceCents: number;
  subtotalCents: number;
  formattedUnitPrice: string;
  formattedSubtotal: string;
}

interface Stop {
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
  items: StopItem[];
  subtotalCents: number;
  taxAmountCents: number;
  totalAmountCents: number;
  formattedSubtotal: string;
  formattedTax: string;
  formattedTotal: string;
}

interface ProductAggregation {
  sku: string;
  productName: string;
  unit: string;
  totalQuantity: number;
}

export interface ManifestTranslations {
  // Summary page
  title: string;
  date: string;
  area: string;
  allAreas: string;
  driver: string;
  unassigned: string;
  totalStops: string;
  estimatedDistance: string;
  estimatedDuration: string;
  warehouseStart: string;
  stopOverview: string;
  productSummaryTitle: string;
  productSummaryDescription: string;
  summaryPage: string;
  stopFooter: string;

  // Stop page
  stopNumber: string;
  orderNumber: string;
  customer: string;
  address: string;
  phone: string;
  deliveryInstructions: string;
  noInstructions: string;
  items: string;
  stop: string;
  suburb: string;

  // Table columns
  sku: string;
  product: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  subtotal: string;
  totalQuantity: string;

  // Totals
  totalsSubtotal: string;
  gst: string;
  total: string;

  // Signature
  signatureTitle: string;
  signatureLine: string;
  printedName: string;
  timeReceived: string;
  driverNotes: string;
}

export interface RouteManifestDocumentProps {
  manifestDate: string;
  areaTag: string | null;
  warehouseAddress: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
  } | null;
  routeSummary: {
    totalStops: number;
    totalDistance: number;
    totalDuration: number;
  };
  stops: Stop[];
  productAggregation: ProductAggregation[];
  translations: ManifestTranslations;
  layout: 'one-per-page' | 'compact';
}

export function RouteManifestDocument({
  manifestDate,
  areaTag,
  warehouseAddress,
  routeSummary,
  stops,
  productAggregation,
  translations,
  layout,
}: RouteManifestDocumentProps) {
  const isCompact = layout === 'compact';

  return (
    <Document>
      {/* Summary Page */}
      <ManifestSummaryPage
        manifestDate={manifestDate}
        areaTag={areaTag}
        warehouseAddress={warehouseAddress}
        routeSummary={routeSummary}
        stops={stops.map((s) => ({
          sequence: s.sequence,
          orderNumber: s.orderNumber,
          customer: { name: s.customer.name },
          address: { suburb: s.address.suburb },
        }))}
        productAggregation={productAggregation}
        translations={{
          title: translations.title,
          date: translations.date,
          area: translations.area,
          allAreas: translations.allAreas,
          driver: translations.driver,
          unassigned: translations.unassigned,
          totalStops: translations.totalStops,
          estimatedDistance: translations.estimatedDistance,
          estimatedDuration: translations.estimatedDuration,
          warehouseStart: translations.warehouseStart,
          stopOverview: translations.stopOverview,
          stop: translations.stop,
          customer: translations.customer,
          suburb: translations.suburb,
          productSummaryTitle: translations.productSummaryTitle,
          productSummaryDescription: translations.productSummaryDescription,
          sku: translations.sku,
          product: translations.product,
          totalQuantity: translations.totalQuantity,
          unit: translations.unit,
          summaryPage: translations.summaryPage,
        }}
      />

      {/* Stop Pages */}
      {isCompact ? (
        // Compact mode: Multiple stops per page
        <Page size="A4" style={styles.pageCompact} wrap>
          {stops.map((stop) => (
            <View key={stop.orderId} wrap={false}>
              <ManifestStopPage
                stop={stop}
                totalStops={routeSummary.totalStops}
                manifestDate={manifestDate}
                compact={true}
                translations={{
                  stopNumber: translations.stopNumber,
                  orderNumber: translations.orderNumber,
                  customer: translations.customer,
                  address: translations.address,
                  phone: translations.phone,
                  deliveryInstructions: translations.deliveryInstructions,
                  noInstructions: translations.noInstructions,
                  items: translations.items,
                  sku: translations.sku,
                  product: translations.product,
                  quantity: translations.quantity,
                  unit: translations.unit,
                  unitPrice: translations.unitPrice,
                  subtotal: translations.subtotal,
                  totalsSubtotal: translations.totalsSubtotal,
                  gst: translations.gst,
                  total: translations.total,
                  signatureTitle: translations.signatureTitle,
                  signatureLine: translations.signatureLine,
                  printedName: translations.printedName,
                  timeReceived: translations.timeReceived,
                  driverNotes: translations.driverNotes,
                  stopFooter: translations.stopFooter,
                }}
              />
            </View>
          ))}
        </Page>
      ) : (
        // One-per-page mode: Each stop gets its own page
        stops.map((stop) => (
          <ManifestStopPage
            key={stop.orderId}
            stop={stop}
            totalStops={routeSummary.totalStops}
            manifestDate={manifestDate}
            compact={false}
            translations={{
              stopNumber: translations.stopNumber,
              orderNumber: translations.orderNumber,
              customer: translations.customer,
              address: translations.address,
              phone: translations.phone,
              deliveryInstructions: translations.deliveryInstructions,
              noInstructions: translations.noInstructions,
              items: translations.items,
              sku: translations.sku,
              product: translations.product,
              quantity: translations.quantity,
              unit: translations.unit,
              unitPrice: translations.unitPrice,
              subtotal: translations.subtotal,
              totalsSubtotal: translations.totalsSubtotal,
              gst: translations.gst,
              total: translations.total,
              signatureTitle: translations.signatureTitle,
              signatureLine: translations.signatureLine,
              printedName: translations.printedName,
              timeReceived: translations.timeReceived,
              driverNotes: translations.driverNotes,
              stopFooter: translations.stopFooter,
            }}
          />
        ))
      )}
    </Document>
  );
}
