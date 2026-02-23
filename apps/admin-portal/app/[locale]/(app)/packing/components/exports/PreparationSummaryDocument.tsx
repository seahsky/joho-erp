import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { PDF_FONT_FAMILY } from '@/lib/pdfFonts';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: PDF_FONT_FAMILY,
  },
  header: {
    fontSize: 20,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  subHeader: {
    fontSize: 11,
    marginBottom: 4,
    color: '#444',
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
  tableCellWide: {
    padding: 5,
    fontSize: 9,
    flex: 2,
  },
  sectionTitle: {
    fontSize: 14,
    marginTop: 15,
    marginBottom: 10,
    fontWeight: 'bold',
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

interface PreparationSummaryDocumentProps {
  productSummary: Array<{
    sku: string;
    productName: string;
    category: string | null;
    unit: string;
    totalQuantity: number;
    orders?: Array<{ orderNumber: string; quantity: number; status: string }>;
  }>;
  deliveryDate: string;
  filters?: { category?: string; area?: string };
  translations: Record<string, string>;
}

function formatOrderRefs(
  orders: Array<{ orderNumber: string; quantity: number }>
): string {
  return orders
    .map((o) => {
      const short = o.orderNumber.replace(/^ORD-0*/, 'ORD-');
      return o.quantity > 1 ? `${short} x${o.quantity}` : short;
    })
    .join(', ');
}

function formatTimestamp(): string {
  return new Intl.DateTimeFormat('en-AU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

export function PreparationSummaryDocument({
  productSummary,
  deliveryDate,
  filters,
  translations: t,
}: PreparationSummaryDocumentProps) {
  // Group products by category
  const grouped = new Map<string, typeof productSummary>();
  for (const product of productSummary) {
    const cat = product.category ?? 'Uncategorised';
    const existing = grouped.get(cat) ?? [];
    existing.push(product);
    grouped.set(cat, existing);
  }
  const sortedCategories = Array.from(grouped.keys()).sort();

  const activeFilters: string[] = [];
  if (filters?.category && filters.category !== 'all') {
    activeFilters.push(`${t.filterLabel || 'Filter'}: ${filters.category}`);
  }
  if (filters?.area) {
    activeFilters.push(`${t.filterLabel || 'Filter'}: ${filters.area}`);
  }

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.header}>
          {t.preparationSummary || 'Preparation Summary'}
        </Text>
        <Text style={styles.subHeader}>
          {t.deliveryDateLabel || 'Delivery Date'}: {deliveryDate}
        </Text>
        {activeFilters.length > 0 && (
          <Text style={styles.subHeader}>{activeFilters.join(' | ')}</Text>
        )}

        {sortedCategories.map((category) => {
          const items = grouped.get(category) ?? [];
          return (
            <View key={category}>
              <Text style={styles.sectionTitle}>{category}</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableCell}>
                    {t.sku || 'SKU'}
                  </Text>
                  <Text style={styles.tableCellWide}>
                    {t.productName || 'Product Name'}
                  </Text>
                  <Text style={styles.tableCell}>
                    {t.totalQuantity || 'Qty'}
                  </Text>
                  <Text style={styles.tableCell}>
                    {t.unit || 'Unit'}
                  </Text>
                  <Text style={[styles.tableCellWide, { flex: 3 }]}>
                    {t.orderReferences || 'Orders'}
                  </Text>
                </View>
                {items.map((item) => (
                  <View key={item.sku} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{item.sku}</Text>
                    <Text style={styles.tableCellWide}>
                      {item.productName}
                    </Text>
                    <Text style={styles.tableCell}>
                      {item.totalQuantity}
                    </Text>
                    <Text style={styles.tableCell}>{item.unit}</Text>
                    <Text style={[styles.tableCellWide, { flex: 3 }]}>
                      {formatOrderRefs(item.orders ?? [])}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        <Text style={styles.footer}>
          {t.totalProducts || 'Total Products'}: {productSummary.length}
          {'  |  '}
          {t.generatedAt || 'Generated at'}: {formatTimestamp()}
        </Text>
      </Page>
    </Document>
  );
}
