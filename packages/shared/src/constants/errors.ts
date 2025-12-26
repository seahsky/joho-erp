/**
 * API Error Codes
 *
 * These error codes are used in API responses and can be translated on the frontend.
 * Use the ERROR_TRANSLATION_KEYS to get the corresponding translation key.
 *
 * Usage in API:
 *   throw new TRPCError({
 *     code: 'NOT_FOUND',
 *     message: API_ERRORS.CUSTOMER_NOT_FOUND, // 'CUSTOMER_NOT_FOUND'
 *   });
 *
 * Usage in Frontend:
 *   const t = useTranslations('apiErrors');
 *   const translatedMessage = t(error.message); // Uses error code as key
 */

// Customer Errors
export const API_ERRORS = {
  // Customer
  CUSTOMER_NOT_FOUND: 'CUSTOMER_NOT_FOUND',
  CUSTOMER_ALREADY_REGISTERED: 'CUSTOMER_ALREADY_REGISTERED',
  CUSTOMER_EMAIL_EXISTS: 'CUSTOMER_EMAIL_EXISTS',
  CUSTOMER_ABN_EXISTS: 'CUSTOMER_ABN_EXISTS',
  CUSTOMER_ALREADY_SUSPENDED: 'CUSTOMER_ALREADY_SUSPENDED',
  CUSTOMER_NOT_SUSPENDED: 'CUSTOMER_NOT_SUSPENDED',
  CUSTOMER_PROFILE_NOT_FOUND: 'CUSTOMER_PROFILE_NOT_FOUND',
  INVALID_CUSTOMER_ID: 'INVALID_CUSTOMER_ID',

  // Order
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  ORDER_ALREADY_CANCELLED: 'ORDER_ALREADY_CANCELLED',
  ORDER_CANNOT_BE_CANCELLED: 'ORDER_CANNOT_BE_CANCELLED',
  ORDER_INVALID_STATUS_TRANSITION: 'ORDER_INVALID_STATUS_TRANSITION',
  ORDER_ALREADY_CONFIRMED: 'ORDER_ALREADY_CONFIRMED',
  ORDER_EMPTY_CART: 'ORDER_EMPTY_CART',

  // Product
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  PRODUCT_SKU_EXISTS: 'PRODUCT_SKU_EXISTS',
  PRODUCT_INSUFFICIENT_STOCK: 'PRODUCT_INSUFFICIENT_STOCK',
  PRODUCT_DISCONTINUED: 'PRODUCT_DISCONTINUED',

  // Category
  CATEGORY_NOT_FOUND: 'CATEGORY_NOT_FOUND',
  CATEGORY_NAME_EXISTS: 'CATEGORY_NAME_EXISTS',
  CATEGORY_HAS_PRODUCTS: 'CATEGORY_HAS_PRODUCTS',

  // Cart
  CART_ITEM_NOT_FOUND: 'CART_ITEM_NOT_FOUND',
  CART_EMPTY: 'CART_EMPTY',
  CART_INVALID_QUANTITY: 'CART_INVALID_QUANTITY',

  // Pricing
  PRICING_NOT_FOUND: 'PRICING_NOT_FOUND',
  PRICING_ALREADY_EXISTS: 'PRICING_ALREADY_EXISTS',
  PRICING_INVALID_DATES: 'PRICING_INVALID_DATES',

  // Credit
  CREDIT_NOT_APPROVED: 'CREDIT_NOT_APPROVED',
  CREDIT_APPLICATION_NOT_FOUND: 'CREDIT_APPLICATION_NOT_FOUND',
  CREDIT_LIMIT_EXCEEDED: 'CREDIT_LIMIT_EXCEEDED',

  // Delivery
  DELIVERY_ROUTE_NOT_FOUND: 'DELIVERY_ROUTE_NOT_FOUND',
  DELIVERY_ALREADY_OPTIMIZED: 'DELIVERY_ALREADY_OPTIMIZED',
  DELIVERY_ALREADY_COMPLETED: 'DELIVERY_ALREADY_COMPLETED',

  // Packing
  PACKING_ORDER_NOT_FOUND: 'PACKING_ORDER_NOT_FOUND',
  PACKING_ALREADY_STARTED: 'PACKING_ALREADY_STARTED',
  PACKING_ALREADY_COMPLETED: 'PACKING_ALREADY_COMPLETED',

  // Company
  COMPANY_SETTINGS_NOT_FOUND: 'COMPANY_SETTINGS_NOT_FOUND',

  // User
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_UNAUTHORIZED: 'USER_UNAUTHORIZED',

  // Upload
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  UPLOAD_INVALID_FILE_TYPE: 'UPLOAD_INVALID_FILE_TYPE',
  UPLOAD_FILE_TOO_LARGE: 'UPLOAD_FILE_TOO_LARGE',

  // Xero
  XERO_NOT_CONNECTED: 'XERO_NOT_CONNECTED',
  XERO_SYNC_FAILED: 'XERO_SYNC_FAILED',

  // Generic
  INVALID_INPUT: 'INVALID_INPUT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
} as const;

export type ApiErrorCode = (typeof API_ERRORS)[keyof typeof API_ERRORS];

/**
 * Translation keys for API errors - use with t('apiErrors.{key}')
 */
export const ERROR_TRANSLATION_KEYS: Record<ApiErrorCode, string> = {
  // Customer
  CUSTOMER_NOT_FOUND: 'apiErrors.customerNotFound',
  CUSTOMER_ALREADY_REGISTERED: 'apiErrors.customerAlreadyRegistered',
  CUSTOMER_EMAIL_EXISTS: 'apiErrors.customerEmailExists',
  CUSTOMER_ABN_EXISTS: 'apiErrors.customerAbnExists',
  CUSTOMER_ALREADY_SUSPENDED: 'apiErrors.customerAlreadySuspended',
  CUSTOMER_NOT_SUSPENDED: 'apiErrors.customerNotSuspended',
  CUSTOMER_PROFILE_NOT_FOUND: 'apiErrors.customerProfileNotFound',
  INVALID_CUSTOMER_ID: 'apiErrors.invalidCustomerId',

  // Order
  ORDER_NOT_FOUND: 'apiErrors.orderNotFound',
  ORDER_ALREADY_CANCELLED: 'apiErrors.orderAlreadyCancelled',
  ORDER_CANNOT_BE_CANCELLED: 'apiErrors.orderCannotBeCancelled',
  ORDER_INVALID_STATUS_TRANSITION: 'apiErrors.orderInvalidStatusTransition',
  ORDER_ALREADY_CONFIRMED: 'apiErrors.orderAlreadyConfirmed',
  ORDER_EMPTY_CART: 'apiErrors.orderEmptyCart',

  // Product
  PRODUCT_NOT_FOUND: 'apiErrors.productNotFound',
  PRODUCT_SKU_EXISTS: 'apiErrors.productSkuExists',
  PRODUCT_INSUFFICIENT_STOCK: 'apiErrors.productInsufficientStock',
  PRODUCT_DISCONTINUED: 'apiErrors.productDiscontinued',

  // Category
  CATEGORY_NOT_FOUND: 'apiErrors.categoryNotFound',
  CATEGORY_NAME_EXISTS: 'apiErrors.categoryNameExists',
  CATEGORY_HAS_PRODUCTS: 'apiErrors.categoryHasProducts',

  // Cart
  CART_ITEM_NOT_FOUND: 'apiErrors.cartItemNotFound',
  CART_EMPTY: 'apiErrors.cartEmpty',
  CART_INVALID_QUANTITY: 'apiErrors.cartInvalidQuantity',

  // Pricing
  PRICING_NOT_FOUND: 'apiErrors.pricingNotFound',
  PRICING_ALREADY_EXISTS: 'apiErrors.pricingAlreadyExists',
  PRICING_INVALID_DATES: 'apiErrors.pricingInvalidDates',

  // Credit
  CREDIT_NOT_APPROVED: 'apiErrors.creditNotApproved',
  CREDIT_APPLICATION_NOT_FOUND: 'apiErrors.creditApplicationNotFound',
  CREDIT_LIMIT_EXCEEDED: 'apiErrors.creditLimitExceeded',

  // Delivery
  DELIVERY_ROUTE_NOT_FOUND: 'apiErrors.deliveryRouteNotFound',
  DELIVERY_ALREADY_OPTIMIZED: 'apiErrors.deliveryAlreadyOptimized',
  DELIVERY_ALREADY_COMPLETED: 'apiErrors.deliveryAlreadyCompleted',

  // Packing
  PACKING_ORDER_NOT_FOUND: 'apiErrors.packingOrderNotFound',
  PACKING_ALREADY_STARTED: 'apiErrors.packingAlreadyStarted',
  PACKING_ALREADY_COMPLETED: 'apiErrors.packingAlreadyCompleted',

  // Company
  COMPANY_SETTINGS_NOT_FOUND: 'apiErrors.companySettingsNotFound',

  // User
  USER_NOT_FOUND: 'apiErrors.userNotFound',
  USER_UNAUTHORIZED: 'apiErrors.userUnauthorized',

  // Upload
  UPLOAD_FAILED: 'apiErrors.uploadFailed',
  UPLOAD_INVALID_FILE_TYPE: 'apiErrors.uploadInvalidFileType',
  UPLOAD_FILE_TOO_LARGE: 'apiErrors.uploadFileTooLarge',

  // Xero
  XERO_NOT_CONNECTED: 'apiErrors.xeroNotConnected',
  XERO_SYNC_FAILED: 'apiErrors.xeroSyncFailed',

  // Generic
  INVALID_INPUT: 'apiErrors.invalidInput',
  INTERNAL_ERROR: 'apiErrors.internalError',
  UNAUTHORIZED: 'apiErrors.unauthorized',
  FORBIDDEN: 'apiErrors.forbidden',
};

/**
 * Get the translation key for an API error code
 * @param errorCode The error code from the API response
 * @returns The translation key to use with t()
 */
export function getErrorTranslationKey(errorCode: string): string {
  return ERROR_TRANSLATION_KEYS[errorCode as ApiErrorCode] || 'apiErrors.unknownError';
}

/**
 * Check if a string is a known API error code
 */
export function isApiErrorCode(message: string): message is ApiErrorCode {
  return message in ERROR_TRANSLATION_KEYS;
}
