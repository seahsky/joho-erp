import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type {
  OverviewData,
  TrendsData,
  TurnoverData,
  ComparisonData,
} from '../../utils/exportUtils';

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    fontSize: 20,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 14,
    marginTop: 15,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  table: {
    display: 'flex',
    width: 'auto',
    marginTop: 10,
    marginBottom: 15,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    borderBottomStyle: 'solid',
    minHeight: 25,
    alignItems: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    fontWeight: 'bold',
    borderBottomWidth: 2,
    borderBottomColor: '#999',
    borderBottomStyle: 'solid',
    minHeight: 30,
    alignItems: 'center',
  },
  tableCell: {
    padding: 5,
    fontSize: 9,
    flex: 1,
  },
  tableCellSmall: {
    padding: 5,
    fontSize: 8,
    flex: 1,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    borderBottomStyle: 'solid',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  summaryValue: {
    fontSize: 11,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#666',
  },
});

interface InventoryReportDocumentProps {
  tab: 'overview' | 'trends' | 'turnover' | 'comparison';
  data: OverviewData | TrendsData | TurnoverData | ComparisonData;
  translations: Record<string, string>;
}

// Helper functions
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-AU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date));
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(date));
}

function formatAUD(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function InventoryReportDocument({
  tab,
  data,
  translations: t,
}: InventoryReportDocumentProps) {
  const exportDate = new Date().toISOString();

  return (
    <Document>
      {tab === 'overview' && (
        <>
          {/* Summary Page */}
          <Page size="A4" style={styles.page}>
            <Text style={styles.header}>{t.inventoryOverview || 'Inventory Overview'}</Text>

            <View style={{ marginBottom: 20 }}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>{t.totalInventoryValue || 'Total Inventory Value'}</Text>
                <Text style={styles.summaryValue}>
                  {formatAUD((data as OverviewData).summary.totalValue)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>{t.totalProducts || 'Total Products'}</Text>
                <Text style={styles.summaryValue}>
                  {(data as OverviewData).summary.totalProducts}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>{t.lowStockItems || 'Low Stock Items'}</Text>
                <Text style={styles.summaryValue}>
                  {(data as OverviewData).summary.lowStockCount}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>{t.outOfStock || 'Out of Stock'}</Text>
                <Text style={styles.summaryValue}>
                  {(data as OverviewData).summary.outOfStockCount}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>{t.categoryBreakdown || 'Category Breakdown'}</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableCell}>{t.category || 'Category'}</Text>
                <Text style={styles.tableCell}>{t.productCount || 'Products'}</Text>
                <Text style={styles.tableCell}>{t.totalStock || 'Stock'}</Text>
                <Text style={styles.tableCell}>{t.totalValue || 'Value'}</Text>
                <Text style={styles.tableCell}>{t.lowStock || 'Low Stock'}</Text>
              </View>
              {(data as OverviewData).categories.map((cat, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{cat.name}</Text>
                  <Text style={styles.tableCell}>{cat.productCount}</Text>
                  <Text style={styles.tableCell}>{cat.totalStock.toFixed(1)}</Text>
                  <Text style={styles.tableCell}>{formatAUD(cat.totalValue)}</Text>
                  <Text style={styles.tableCell}>{cat.lowStockCount}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.footer}>
              {t.exportedOn || 'Exported on'}: {formatDate(new Date(exportDate))} {formatTime(new Date(exportDate))}
            </Text>
          </Page>

          {/* Transactions Page */}
          <Page size="A4" orientation="landscape" style={styles.page}>
            <Text style={styles.header}>{t.recentTransactions || 'Recent Transactions'}</Text>

            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableCellSmall}>{t.date || 'Date'}</Text>
                <Text style={styles.tableCellSmall}>{t.time || 'Time'}</Text>
                <Text style={styles.tableCellSmall}>{t.sku || 'SKU'}</Text>
                <Text style={[styles.tableCellSmall, { flex: 2 }]}>{t.product || 'Product'}</Text>
                <Text style={styles.tableCellSmall}>{t.type || 'Type'}</Text>
                <Text style={styles.tableCellSmall}>{t.quantity || 'Qty'}</Text>
                <Text style={styles.tableCellSmall}>{t.stockChange || 'Stock'}</Text>
              </View>
              {(data as OverviewData).transactions.slice(0, 50).map((tx) => (
                <View key={tx.id} style={styles.tableRow}>
                  <Text style={styles.tableCellSmall}>{formatDate(tx.createdAt)}</Text>
                  <Text style={styles.tableCellSmall}>{formatTime(tx.createdAt)}</Text>
                  <Text style={styles.tableCellSmall}>{tx.product.sku}</Text>
                  <Text style={[styles.tableCellSmall, { flex: 2 }]}>
                    {tx.product.name.substring(0, 30)}
                  </Text>
                  <Text style={styles.tableCellSmall}>{tx.type}</Text>
                  <Text style={styles.tableCellSmall}>{tx.quantity.toFixed(1)}</Text>
                  <Text style={styles.tableCellSmall}>
                    {tx.previousStock.toFixed(0)}→{tx.newStock.toFixed(0)}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={styles.footer}>
              {t.page || 'Page'} 2 | {t.showingFirst || 'Showing first'} 50 {t.transactions || 'transactions'}
            </Text>
          </Page>
        </>
      )}

      {tab === 'trends' && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.header}>
            {t.inventoryTrends || 'Inventory Trends'} ({(data as TrendsData).granularity})
          </Text>

          <Text style={styles.sectionTitle}>{t.stockMovement || 'Stock Movement'}</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableCell}>{t.period || 'Period'}</Text>
              <Text style={styles.tableCell}>{t.stockIn || 'Stock In'}</Text>
              <Text style={styles.tableCell}>{t.stockOut || 'Stock Out'}</Text>
              <Text style={styles.tableCell}>{t.netChange || 'Net Change'}</Text>
            </View>
            {(data as TrendsData).stockMovement.map((item, idx) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={styles.tableCell}>{item.period}</Text>
                <Text style={styles.tableCell}>{item.stockIn.toFixed(1)}</Text>
                <Text style={styles.tableCell}>{item.stockOut.toFixed(1)}</Text>
                <Text style={styles.tableCell}>
                  {(item.stockIn - item.stockOut).toFixed(1)}
                </Text>
              </View>
            ))}
          </View>

          <Text style={styles.footer}>
            {t.exportedOn || 'Exported on'}: {formatDate(new Date(exportDate))} {formatTime(new Date(exportDate))}
          </Text>
        </Page>
      )}

      {tab === 'turnover' && (
        <Page size="A4" orientation="landscape" style={styles.page}>
          <Text style={styles.header}>
            {t.productTurnover || 'Product Turnover'} ({(data as TurnoverData).granularity}, {(data as TurnoverData).periodDays} {t.days || 'days'})
          </Text>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableCellSmall}>{t.sku || 'SKU'}</Text>
              <Text style={[styles.tableCellSmall, { flex: 2 }]}>{t.product || 'Product'}</Text>
              <Text style={styles.tableCellSmall}>{t.currentStock || 'Stock'}</Text>
              <Text style={styles.tableCellSmall}>{t.totalSold || 'Sold'}</Text>
              <Text style={styles.tableCellSmall}>{t.velocity || 'Velocity'}</Text>
              <Text style={styles.tableCellSmall}>{t.daysOnHand || 'Days on Hand'}</Text>
            </View>
            {(data as TurnoverData).metrics.map((item, idx) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={styles.tableCellSmall}>{item.sku}</Text>
                <Text style={[styles.tableCellSmall, { flex: 2 }]}>
                  {item.name.substring(0, 30)}
                </Text>
                <Text style={styles.tableCellSmall}>{item.currentStock.toFixed(1)}</Text>
                <Text style={styles.tableCellSmall}>{item.totalSold.toFixed(1)}</Text>
                <Text style={styles.tableCellSmall}>{item.velocity.toFixed(2)}</Text>
                <Text style={styles.tableCellSmall}>{item.daysOnHand}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.footer}>
            {t.exportedOn || 'Exported on'}: {formatDate(new Date(exportDate))} {formatTime(new Date(exportDate))}
          </Text>
        </Page>
      )}

      {tab === 'comparison' && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.header}>
            {t.comparisonAnalytics || 'Comparison Analytics'} -{' '}
            {(data as ComparisonData).comparisonType === 'week_over_week'
              ? t.weekOverWeek || 'Week over Week'
              : t.monthOverMonth || 'Month over Month'}
          </Text>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableCell}>{t.metric || 'Metric'}</Text>
              <Text style={styles.tableCell}>{t.current || 'Current'}</Text>
              <Text style={styles.tableCell}>{t.previous || 'Previous'}</Text>
              <Text style={styles.tableCell}>{t.change || 'Change'}</Text>
              <Text style={styles.tableCell}>{t.changePercent || 'Change %'}</Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>{t.stockIn || 'Stock In'}</Text>
              <Text style={styles.tableCell}>
                {(data as ComparisonData).stockIn.current.toFixed(1)}
              </Text>
              <Text style={styles.tableCell}>
                {(data as ComparisonData).stockIn.previous.toFixed(1)}
              </Text>
              <Text style={styles.tableCell}>
                {(
                  (data as ComparisonData).stockIn.current -
                  (data as ComparisonData).stockIn.previous
                ).toFixed(1)}
              </Text>
              <Text style={styles.tableCell}>
                {(data as ComparisonData).stockIn.change.toFixed(1)}%
              </Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>{t.stockOut || 'Stock Out'}</Text>
              <Text style={styles.tableCell}>
                {(data as ComparisonData).stockOut.current.toFixed(1)}
              </Text>
              <Text style={styles.tableCell}>
                {(data as ComparisonData).stockOut.previous.toFixed(1)}
              </Text>
              <Text style={styles.tableCell}>
                {(
                  (data as ComparisonData).stockOut.current -
                  (data as ComparisonData).stockOut.previous
                ).toFixed(1)}
              </Text>
              <Text style={styles.tableCell}>
                {(data as ComparisonData).stockOut.change.toFixed(1)}%
              </Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>{t.transactions || 'Transactions'}</Text>
              <Text style={styles.tableCell}>
                {(data as ComparisonData).transactions.current}
              </Text>
              <Text style={styles.tableCell}>
                {(data as ComparisonData).transactions.previous}
              </Text>
              <Text style={styles.tableCell}>
                {(data as ComparisonData).transactions.current -
                  (data as ComparisonData).transactions.previous}
              </Text>
              <Text style={styles.tableCell}>
                {(data as ComparisonData).transactions.change.toFixed(1)}%
              </Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>{t.netMovement || 'Net Movement'}</Text>
              <Text style={styles.tableCell}>
                {(data as ComparisonData).netMovement.current.toFixed(1)}
              </Text>
              <Text style={styles.tableCell}>
                {(data as ComparisonData).netMovement.previous.toFixed(1)}
              </Text>
              <Text style={styles.tableCell}>
                {(
                  (data as ComparisonData).netMovement.current -
                  (data as ComparisonData).netMovement.previous
                ).toFixed(1)}
              </Text>
              <Text style={styles.tableCell}>
                {(data as ComparisonData).netMovement.change.toFixed(1)}%
              </Text>
            </View>
          </View>

          <Text style={styles.footer}>
            {t.exportedOn || 'Exported on'}: {formatDate(new Date(exportDate))} {formatTime(new Date(exportDate))}
          </Text>
        </Page>
      )}
    </Document>
  );
}
