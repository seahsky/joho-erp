import { View, Text } from '@react-pdf/renderer';
import { styles } from './manifest-styles';

interface ProductAggregation {
  sku: string;
  productName: string;
  unit: string;
  totalQuantity: number;
}

interface ManifestProductSummaryProps {
  products: ProductAggregation[];
  translations: {
    title: string;
    description: string;
    sku: string;
    product: string;
    totalQuantity: string;
    unit: string;
  };
}

export function ManifestProductSummary({ products, translations }: ManifestProductSummaryProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{translations.title}</Text>
      <Text style={styles.sectionSubtitle}>{translations.description}</Text>

      <View style={styles.table}>
        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.colSummarySku]}>{translations.sku}</Text>
          <Text style={[styles.tableHeaderCell, styles.colSummaryProduct]}>
            {translations.product}
          </Text>
          <Text style={[styles.tableHeaderCell, styles.colSummaryQty]}>
            {translations.totalQuantity}
          </Text>
          <Text style={[styles.tableHeaderCell, styles.colSummaryUnit]}>{translations.unit}</Text>
        </View>

        {/* Table Rows */}
        {products.map((product, index) => (
          <View
            key={product.sku}
            style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
          >
            <Text style={[styles.tableCellBold, styles.colSummarySku]}>{product.sku}</Text>
            <Text style={[styles.tableCell, styles.colSummaryProduct]}>{product.productName}</Text>
            <Text style={[styles.tableCellBold, styles.colSummaryQty]}>
              {product.totalQuantity}
            </Text>
            <Text style={[styles.tableCell, styles.colSummaryUnit]}>{product.unit}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
