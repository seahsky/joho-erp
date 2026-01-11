import * as XLSX from 'xlsx';
import { formatAUD } from '@joho-erp/shared';

// Type definitions for export data
export interface OverviewData {
  summary: {
    totalValue: number;
    totalProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  categories: Array<{
    name: string;
    productCount: number;
    totalStock: number;
    totalValue: number;
    lowStockCount: number;
  }>;
  transactions: Array<{
    id: string;
    createdAt: Date;
    product: {
      sku: string;
      name: string;
      unit: string;
    };
    type: string;
    adjustmentType: string | null;
    quantity: number;
    previousStock: number;
    newStock: number;
    notes: string | null;
  }>;
}

export interface TrendsData {
  stockMovement: Array<{
    period: string;
    stockIn: number;
    stockOut: number;
  }>;
  inventoryValue: Array<{
    period: string;
    totalValue: number;
  }>;
  granularity: string;
}

export interface TurnoverData {
  metrics: Array<{
    productId: string;
    sku: string;
    name: string;
    unit: string;
    currentStock: number;
    totalSold: number;
    transactionCount: number;
    velocity: number;
    daysOnHand: number;
  }>;
  granularity: string;
  periodDays: number;
}

export interface ComparisonData {
  comparisonType: string;
  stockIn: {
    current: number;
    previous: number;
    change: number;
  };
  stockOut: {
    current: number;
    previous: number;
    change: number;
  };
  transactions: {
    current: number;
    previous: number;
    change: number;
  };
  netMovement: {
    current: number;
    previous: number;
    change: number;
  };
}

export interface ExportConfig {
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
    second: '2-digit',
    hour12: false,
  }).format(new Date(date));
}

function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

// Main export function
export function generateExcel(config: ExportConfig): Blob {
  const workbook = XLSX.utils.book_new();

  switch (config.tab) {
    case 'overview':
      addOverviewSheets(workbook, config.data as OverviewData, config.translations);
      break;
    case 'trends':
      addTrendsSheets(workbook, config.data as TrendsData, config.translations);
      break;
    case 'turnover':
      addTurnoverSheet(workbook, config.data as TurnoverData, config.translations);
      break;
    case 'comparison':
      addComparisonSheet(workbook, config.data as ComparisonData, config.translations);
      break;
  }

  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

// Overview tab export
function addOverviewSheets(
  workbook: XLSX.WorkBook,
  data: OverviewData,
  t: Record<string, string>
) {
  // Sheet 1: Summary
  const summaryData = [
    [t.summaryTitle || 'Inventory Summary'],
    [],
    [t.totalInventoryValue || 'Total Inventory Value', formatAUD(data.summary.totalValue)],
    [t.totalProducts || 'Total Products', data.summary.totalProducts.toString()],
    [t.lowStockItems || 'Low Stock Items', data.summary.lowStockCount.toString()],
    [t.outOfStock || 'Out of Stock', data.summary.outOfStockCount.toString()],
    [],
    [t.exportedAt || 'Exported At', new Date().toISOString()],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, t.summary || 'Summary');

  // Sheet 2: Category Breakdown
  const categoryData = [
    [
      t.category || 'Category',
      t.productCount || 'Product Count',
      t.totalStock || 'Total Stock',
      t.totalValue || 'Total Value',
      t.lowStockCount || 'Low Stock Count',
    ],
    ...data.categories.map((cat) => [
      cat.name,
      cat.productCount.toString(),
      formatNumber(cat.totalStock, 2),
      formatAUD(cat.totalValue),
      cat.lowStockCount.toString(),
    ]),
  ];
  const categorySheet = XLSX.utils.aoa_to_sheet(categoryData);
  XLSX.utils.book_append_sheet(workbook, categorySheet, t.categories || 'Categories');

  // Sheet 3: Transactions
  const transactionData = [
    [
      t.date || 'Date',
      t.time || 'Time',
      t.productSku || 'Product SKU',
      t.productName || 'Product Name',
      t.unit || 'Unit',
      t.type || 'Type',
      t.adjustmentType || 'Adjustment Type',
      t.quantity || 'Quantity',
      t.previousStock || 'Previous Stock',
      t.newStock || 'New Stock',
      t.stockChange || 'Stock Change',
      t.notes || 'Notes',
    ],
    ...data.transactions.map((tx) => [
      formatDate(tx.createdAt),
      formatTime(tx.createdAt),
      tx.product.sku,
      tx.product.name,
      tx.product.unit,
      tx.type,
      tx.adjustmentType || '-',
      formatNumber(tx.quantity, 2),
      formatNumber(tx.previousStock, 2),
      formatNumber(tx.newStock, 2),
      `${formatNumber(tx.previousStock, 2)} → ${formatNumber(tx.newStock, 2)}`,
      tx.notes || '-',
    ]),
  ];
  const txSheet = XLSX.utils.aoa_to_sheet(transactionData);
  XLSX.utils.book_append_sheet(workbook, txSheet, t.transactions || 'Transactions');
}

// Trends tab export
function addTrendsSheets(
  workbook: XLSX.WorkBook,
  data: TrendsData,
  t: Record<string, string>
) {
  // Sheet 1: Stock Movement
  const stockMovementData = [
    [t.stockMovementTitle || `Stock Movement (${data.granularity})`],
    [],
    [t.period || 'Period', t.stockIn || 'Stock In', t.stockOut || 'Stock Out', t.netChange || 'Net Change'],
    ...data.stockMovement.map((item) => [
      item.period,
      formatNumber(item.stockIn, 1),
      formatNumber(item.stockOut, 1),
      formatNumber(item.stockIn - item.stockOut, 1),
    ]),
  ];
  const stockMovementSheet = XLSX.utils.aoa_to_sheet(stockMovementData);
  XLSX.utils.book_append_sheet(workbook, stockMovementSheet, t.stockMovement || 'Stock Movement');

  // Sheet 2: Inventory Value
  const inventoryValueData = [
    [t.inventoryValueTitle || `Inventory Value History (${data.granularity})`],
    [],
    [t.period || 'Period', t.totalValue || 'Total Value (AUD)'],
    ...data.inventoryValue.map((item) => [
      item.period,
      formatAUD(item.totalValue),
    ]),
  ];
  const inventoryValueSheet = XLSX.utils.aoa_to_sheet(inventoryValueData);
  XLSX.utils.book_append_sheet(workbook, inventoryValueSheet, t.inventoryValue || 'Inventory Value');
}

// Turnover tab export
function addTurnoverSheet(
  workbook: XLSX.WorkBook,
  data: TurnoverData,
  t: Record<string, string>
) {
  const turnoverData = [
    [t.turnoverTitle || `Product Turnover Metrics (${data.granularity}, ${data.periodDays} days)`],
    [],
    [
      t.productSku || 'Product SKU',
      t.productName || 'Product Name',
      t.unit || 'Unit',
      t.currentStock || 'Current Stock',
      t.totalSold || 'Total Sold',
      t.transactionCount || 'Transaction Count',
      t.velocity || 'Velocity (units/day)',
      t.daysOnHand || 'Days on Hand',
    ],
    ...data.metrics.map((item) => [
      item.sku,
      item.name,
      item.unit,
      formatNumber(item.currentStock, 2),
      formatNumber(item.totalSold, 2),
      item.transactionCount.toString(),
      formatNumber(item.velocity, 2),
      item.daysOnHand.toString(),
    ]),
  ];
  const turnoverSheet = XLSX.utils.aoa_to_sheet(turnoverData);
  XLSX.utils.book_append_sheet(workbook, turnoverSheet, t.turnover || 'Product Turnover');
}

// Comparison tab export
function addComparisonSheet(
  workbook: XLSX.WorkBook,
  data: ComparisonData,
  t: Record<string, string>
) {
  const comparisonType =
    data.comparisonType === 'week_over_week'
      ? t.weekOverWeek || 'Week over Week'
      : t.monthOverMonth || 'Month over Month';

  const comparisonData = [
    [t.comparisonTitle || `Comparison Analytics - ${comparisonType}`],
    [],
    [
      t.metric || 'Metric',
      t.currentPeriod || 'Current Period',
      t.previousPeriod || 'Previous Period',
      t.change || 'Change',
      t.changePercent || 'Change %',
    ],
    [
      t.stockIn || 'Stock In',
      formatNumber(data.stockIn.current, 1),
      formatNumber(data.stockIn.previous, 1),
      formatNumber(data.stockIn.current - data.stockIn.previous, 1),
      formatNumber(data.stockIn.change, 1) + '%',
    ],
    [
      t.stockOut || 'Stock Out',
      formatNumber(data.stockOut.current, 1),
      formatNumber(data.stockOut.previous, 1),
      formatNumber(data.stockOut.current - data.stockOut.previous, 1),
      formatNumber(data.stockOut.change, 1) + '%',
    ],
    [
      t.transactions || 'Transactions',
      data.transactions.current.toString(),
      data.transactions.previous.toString(),
      (data.transactions.current - data.transactions.previous).toString(),
      formatNumber(data.transactions.change, 1) + '%',
    ],
    [
      t.netMovement || 'Net Movement',
      formatNumber(data.netMovement.current, 1),
      formatNumber(data.netMovement.previous, 1),
      formatNumber(data.netMovement.current - data.netMovement.previous, 1),
      formatNumber(data.netMovement.change, 1) + '%',
    ],
  ];
  const comparisonSheet = XLSX.utils.aoa_to_sheet(comparisonData);
  XLSX.utils.book_append_sheet(workbook, comparisonSheet, t.comparison || 'Comparison');
}
