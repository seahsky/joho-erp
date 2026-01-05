import { View, Text, Page } from '@react-pdf/renderer';
import { styles } from './manifest-styles';
import { ManifestProductSummary } from './ManifestProductSummary';

interface RouteStop {
  sequence: number;
  orderNumber: string;
  customer: {
    name: string;
  };
  address: {
    suburb: string;
  };
}

interface ProductAggregation {
  sku: string;
  productName: string;
  unit: string;
  totalQuantity: number;
}

interface ManifestSummaryPageProps {
  manifestDate: string;
  areaName: string | null;
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
  stops: RouteStop[];
  productAggregation: ProductAggregation[];
  translations: {
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
    stop: string;
    customer: string;
    suburb: string;
    productSummaryTitle: string;
    productSummaryDescription: string;
    sku: string;
    product: string;
    totalQuantity: string;
    unit: string;
    summaryPage: string;
  };
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatDistance(km: number): string {
  if (km === 0) return '-';
  return `${km.toFixed(1)} km`;
}

export function ManifestSummaryPage({
  manifestDate,
  areaName,
  warehouseAddress,
  routeSummary,
  stops,
  productAggregation,
  translations,
}: ManifestSummaryPageProps) {
  return (
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{translations.title}</Text>
          <Text style={styles.subtitle}>{manifestDate}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerInfo}>
            {translations.area}: {areaName ? areaName.charAt(0).toUpperCase() + areaName.slice(1) : translations.allAreas}
          </Text>
          <Text style={styles.headerInfoBold}>
            {routeSummary.totalStops} {translations.totalStops}
          </Text>
        </View>
      </View>

      {/* Route Summary Cards */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{routeSummary.totalStops}</Text>
          <Text style={styles.summaryLabel}>{translations.totalStops}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{formatDistance(routeSummary.totalDistance)}</Text>
          <Text style={styles.summaryLabel}>{translations.estimatedDistance}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{formatDuration(routeSummary.totalDuration)}</Text>
          <Text style={styles.summaryLabel}>{translations.estimatedDuration}</Text>
        </View>
      </View>

      {/* Warehouse Address */}
      {warehouseAddress && (
        <View style={styles.section}>
          <Text style={styles.addressLabel}>{translations.warehouseStart}</Text>
          <Text style={styles.customerDetail}>
            {warehouseAddress.street}, {warehouseAddress.suburb} {warehouseAddress.state}{' '}
            {warehouseAddress.postcode}
          </Text>
        </View>
      )}

      {/* Route Overview Table */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{translations.stopOverview}</Text>

        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colStop]}>{translations.stop}</Text>
            <Text style={[styles.tableHeaderCell, styles.colCustomer]}>
              {translations.customer}
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colSuburb]}>{translations.suburb}</Text>
          </View>

          {/* Table Rows */}
          {stops.map((stop, index) => (
            <View key={stop.orderNumber} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCellBold, styles.colStop]}>{stop.sequence}</Text>
              <Text style={[styles.tableCell, styles.colCustomer]}>{stop.customer.name}</Text>
              <Text style={[styles.tableCell, styles.colSuburb]}>{stop.address.suburb}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Product Summary */}
      <ManifestProductSummary
        products={productAggregation}
        translations={{
          title: translations.productSummaryTitle,
          description: translations.productSummaryDescription,
          sku: translations.sku,
          product: translations.product,
          totalQuantity: translations.totalQuantity,
          unit: translations.unit,
        }}
      />

      {/* Footer */}
      <View style={styles.footer}>
        <Text>{manifestDate}</Text>
        <Text>{translations.summaryPage}</Text>
      </View>
    </Page>
  );
}
