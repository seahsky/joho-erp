import { View, Text, Page } from '@react-pdf/renderer';
import { styles } from './manifest-styles';
import { ManifestSignatureSection } from './ManifestSignatureSection';

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
  formattedSubtotal: string;
  formattedTax: string;
  formattedTotal: string;
}

interface ManifestStopPageProps {
  stop: Stop;
  totalStops: number;
  manifestDate: string;
  compact?: boolean;
  translations: {
    stopNumber: string;
    orderNumber: string;
    customer: string;
    address: string;
    phone: string;
    deliveryInstructions: string;
    noInstructions: string;
    items: string;
    sku: string;
    product: string;
    quantity: string;
    unit: string;
    unitPrice: string;
    subtotal: string;
    totalsSubtotal: string;
    gst: string;
    total: string;
    signatureTitle: string;
    signatureLine: string;
    printedName: string;
    timeReceived: string;
    driverNotes: string;
  };
}

export function ManifestStopPage({
  stop,
  totalStops,
  manifestDate,
  compact = false,
  translations,
}: ManifestStopPageProps) {
  const pageStyle = compact ? styles.pageCompact : styles.page;

  const content = (
    <>
      {/* Stop Header */}
      <View style={styles.stopHeader}>
        <Text style={styles.stopNumber}>
          {translations.stopNumber
            .replace('{number}', String(stop.sequence))
            .replace('{total}', String(totalStops))}
        </Text>
        <Text style={styles.orderNumber}>
          {translations.orderNumber} {stop.orderNumber}
        </Text>
      </View>

      {/* Customer Info */}
      <View style={styles.customerBlock}>
        <Text style={styles.customerName}>{stop.customer.name}</Text>
        {stop.customer.phone && (
          <Text style={styles.customerDetail}>
            {translations.phone}: {stop.customer.phone}
          </Text>
        )}
      </View>

      {/* Address Block */}
      <View style={styles.addressBlock}>
        <Text style={styles.addressLabel}>{translations.address}</Text>
        <Text style={styles.addressText}>
          {stop.address.street}
          {'\n'}
          {stop.address.suburb} {stop.address.state} {stop.address.postcode}
        </Text>

        {stop.address.deliveryInstructions && (
          <View style={styles.deliveryInstructions}>
            <Text style={styles.instructionsLabel}>{translations.deliveryInstructions}</Text>
            <Text style={styles.instructionsText}>{stop.address.deliveryInstructions}</Text>
          </View>
        )}
      </View>

      {/* Items Table */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{translations.items}</Text>

        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colSku]}>{translations.sku}</Text>
            <Text style={[styles.tableHeaderCell, styles.colProduct]}>{translations.product}</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>{translations.quantity}</Text>
            <Text style={[styles.tableHeaderCell, styles.colUnit]}>{translations.unit}</Text>
            <Text style={[styles.tableHeaderCell, styles.colPrice]}>{translations.unitPrice}</Text>
            <Text style={[styles.tableHeaderCell, styles.colSubtotal]}>
              {translations.subtotal}
            </Text>
          </View>

          {/* Table Rows */}
          {stop.items.map((item, index) => (
            <View key={item.sku} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCellBold, styles.colSku]}>{item.sku}</Text>
              <Text style={[styles.tableCell, styles.colProduct]}>{item.productName}</Text>
              <Text style={[styles.tableCellBold, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, styles.colUnit]}>{item.unit}</Text>
              <Text style={[styles.tableCell, styles.colPrice]}>{item.formattedUnitPrice}</Text>
              <Text style={[styles.tableCellBold, styles.colSubtotal]}>
                {item.formattedSubtotal}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>{translations.totalsSubtotal}</Text>
            <Text style={styles.totalsValue}>{stop.formattedSubtotal}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>{translations.gst}</Text>
            <Text style={styles.totalsValue}>{stop.formattedTax}</Text>
          </View>
          <View style={styles.totalsFinalRow}>
            <Text style={styles.totalsFinalLabel}>{translations.total}</Text>
            <Text style={styles.totalsFinalValue}>{stop.formattedTotal}</Text>
          </View>
        </View>
      </View>

      {/* Signature Section */}
      <ManifestSignatureSection
        translations={{
          title: translations.signatureTitle,
          signatureLine: translations.signatureLine,
          printedName: translations.printedName,
          timeReceived: translations.timeReceived,
          driverNotes: translations.driverNotes,
        }}
      />

      {/* Footer */}
      <View style={styles.footer}>
        <Text>{manifestDate}</Text>
        <Text>
          Stop {stop.sequence} of {totalStops}
        </Text>
      </View>
    </>
  );

  // In compact mode, don't wrap in a Page (let parent handle pagination)
  if (compact) {
    return <View style={{ marginBottom: 30 }}>{content}</View>;
  }

  // In one-per-page mode, wrap in a Page
  return <Page size="A4" style={pageStyle}>{content}</Page>;
}
