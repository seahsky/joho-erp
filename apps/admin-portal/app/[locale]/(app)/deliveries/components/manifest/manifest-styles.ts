import { StyleSheet, Font } from '@react-pdf/renderer';

// Register fonts for consistent rendering
Font.register({
  family: 'Inter',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff2',
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hjp-Ek-_EeA.woff2',
      fontWeight: 600,
    },
    {
      src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hjp-Ek-_EeA.woff2',
      fontWeight: 700,
    },
  ],
});

export const styles = StyleSheet.create({
  // Page styles
  page: {
    fontFamily: 'Inter',
    fontSize: 10,
    padding: 30,
    backgroundColor: '#FFFFFF',
  },
  pageCompact: {
    fontFamily: 'Inter',
    fontSize: 9,
    padding: 25,
    backgroundColor: '#FFFFFF',
  },

  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#1a1a1a',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#666666',
  },
  headerInfo: {
    fontSize: 10,
    color: '#333333',
    marginTop: 2,
  },
  headerInfoBold: {
    fontSize: 10,
    fontWeight: 600,
    color: '#1a1a1a',
  },

  // Section styles
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  sectionSubtitle: {
    fontSize: 9,
    color: '#666666',
    marginBottom: 8,
  },

  // Stop header styles
  stopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 10,
    marginBottom: 10,
  },
  stopNumber: {
    fontSize: 14,
    fontWeight: 700,
    color: '#1a1a1a',
  },
  orderNumber: {
    fontSize: 11,
    fontWeight: 600,
    color: '#333333',
  },

  // Customer info styles
  customerBlock: {
    marginBottom: 12,
  },
  customerName: {
    fontSize: 12,
    fontWeight: 600,
    color: '#1a1a1a',
    marginBottom: 2,
  },
  customerDetail: {
    fontSize: 10,
    color: '#333333',
    marginBottom: 1,
  },

  // Address styles
  addressBlock: {
    backgroundColor: '#fafafa',
    padding: 10,
    marginBottom: 12,
  },
  addressLabel: {
    fontSize: 8,
    fontWeight: 600,
    color: '#666666',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressText: {
    fontSize: 11,
    color: '#1a1a1a',
    lineHeight: 1.4,
  },
  deliveryInstructions: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  instructionsLabel: {
    fontSize: 8,
    fontWeight: 600,
    color: '#cc6600',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  instructionsText: {
    fontSize: 10,
    color: '#cc6600',
    fontStyle: 'italic',
  },

  // Table styles
  table: {
    width: '100%',
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    padding: 6,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: 600,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    padding: 6,
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    padding: 6,
    backgroundColor: '#fafafa',
  },
  tableCell: {
    fontSize: 9,
    color: '#333333',
  },
  tableCellBold: {
    fontSize: 9,
    fontWeight: 600,
    color: '#1a1a1a',
  },

  // Column widths for items table
  colSku: { width: '15%' },
  colProduct: { width: '35%' },
  colQty: { width: '10%', textAlign: 'right' },
  colUnit: { width: '10%' },
  colPrice: { width: '15%', textAlign: 'right' },
  colSubtotal: { width: '15%', textAlign: 'right' },

  // Column widths for product summary table
  colSummarySku: { width: '20%' },
  colSummaryProduct: { width: '50%' },
  colSummaryQty: { width: '15%', textAlign: 'right' },
  colSummaryUnit: { width: '15%' },

  // Column widths for route overview
  colStop: { width: '10%' },
  colCustomer: { width: '40%' },
  colSuburb: { width: '50%' },

  // Totals styles
  totalsBlock: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    alignItems: 'flex-end',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: 200,
    marginBottom: 3,
  },
  totalsLabel: {
    fontSize: 9,
    color: '#666666',
    width: 100,
    textAlign: 'right',
    marginRight: 10,
  },
  totalsValue: {
    fontSize: 9,
    color: '#333333',
    width: 80,
    textAlign: 'right',
  },
  totalsFinalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: 200,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  totalsFinalLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#1a1a1a',
    width: 100,
    textAlign: 'right',
    marginRight: 10,
  },
  totalsFinalValue: {
    fontSize: 11,
    fontWeight: 700,
    color: '#1a1a1a',
    width: 80,
    textAlign: 'right',
  },

  // Signature styles
  signatureSection: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  signatureTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: '#666666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  signatureField: {
    width: '45%',
  },
  signatureLabel: {
    fontSize: 8,
    color: '#666666',
    marginBottom: 5,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    height: 25,
  },
  notesField: {
    width: '100%',
  },
  notesLines: {
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    height: 20,
    marginBottom: 5,
  },

  // Route summary card styles
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    padding: 15,
    marginBottom: 15,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1a1a1a',
  },
  summaryLabel: {
    fontSize: 8,
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 3,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#999999',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingTop: 10,
  },

  // Page break helper
  pageBreak: {
    marginTop: 0,
    marginBottom: 0,
  },
});
