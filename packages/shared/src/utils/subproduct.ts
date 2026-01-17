/**
 * Subproduct Utility Functions
 *
 * Subproducts are derived from parent products with calculated virtual stock
 * based on a loss percentage. When a subproduct is ordered, the consumption
 * is calculated back to the parent product.
 *
 * Key concepts:
 * - Parent products maintain actual physical stock
 * - Subproducts have virtual stock calculated as: parentStock × (1 - lossPercentage / 100)
 * - When ordering subproducts, parent consumption = orderQty / (1 - lossPercentage / 100)
 */

/**
 * Calculate the virtual stock for a subproduct based on parent stock and loss percentage.
 *
 * Formula: subproductStock = parentStock × (1 - lossPercentage / 100)
 *
 * @param parentStock - Current stock of the parent product
 * @param lossPercentage - Loss percentage (0-99) for the subproduct
 * @returns Calculated virtual stock for the subproduct
 *
 * @example
 * // Parent has 100kg, subproduct has 15% loss
 * calculateSubproductStock(100, 15) // Returns 85
 */
export function calculateSubproductStock(
  parentStock: number,
  lossPercentage: number
): number {
  if (lossPercentage < 0 || lossPercentage >= 100) {
    throw new Error('Loss percentage must be between 0 and 99');
  }
  const yieldMultiplier = 1 - lossPercentage / 100;
  // Round to 2 decimal places to avoid floating point issues
  return Math.round(parentStock * yieldMultiplier * 100) / 100;
}

/**
 * Calculate how much parent stock needs to be consumed when ordering a subproduct.
 *
 * Formula: parentConsumption = orderQuantity / (1 - lossPercentage / 100)
 *
 * This accounts for the loss during processing - ordering 85kg of processed meat
 * with 15% loss means consuming 100kg of the parent carcass.
 *
 * @param orderQuantity - Quantity of subproduct being ordered
 * @param lossPercentage - Loss percentage (0-99) for the subproduct
 * @returns Quantity of parent product to consume
 *
 * @example
 * // Ordering 85kg of ground beef with 15% loss
 * calculateParentConsumption(85, 15) // Returns 100 (85 / 0.85 = 100)
 */
export function calculateParentConsumption(
  orderQuantity: number,
  lossPercentage: number
): number {
  if (lossPercentage < 0 || lossPercentage >= 100) {
    throw new Error('Loss percentage must be between 0 and 99');
  }
  if (orderQuantity <= 0) {
    return 0;
  }
  const yieldMultiplier = 1 - lossPercentage / 100;
  // Round to 2 decimal places to avoid floating point issues
  return Math.round((orderQuantity / yieldMultiplier) * 100) / 100;
}

/**
 * Type guard to check if a product is a subproduct (has a parent).
 *
 * @param product - Product object with optional parentProductId
 * @returns True if the product is a subproduct
 */
export function isSubproduct(product: {
  parentProductId?: string | null;
}): boolean {
  return product.parentProductId != null;
}

/**
 * Check if a product can have subproducts (must not be a subproduct itself).
 * Subproducts cannot have nested subproducts (single-level only).
 *
 * @param product - Product object with optional parentProductId
 * @returns True if the product can have subproducts
 */
export function canHaveSubproducts(product: {
  parentProductId?: string | null;
}): boolean {
  return !isSubproduct(product);
}

/**
 * Validate loss percentage for subproduct creation/update.
 *
 * @param lossPercentage - The loss percentage to validate
 * @returns True if the loss percentage is valid (0-99)
 */
export function isValidLossPercentage(lossPercentage: number): boolean {
  return (
    typeof lossPercentage === 'number' &&
    !isNaN(lossPercentage) &&
    lossPercentage >= 0 &&
    lossPercentage < 100
  );
}

/**
 * Get the effective loss percentage for a subproduct, considering inheritance.
 *
 * If the subproduct has null for estimatedLossPercentage, it inherits from the parent.
 * Otherwise, it uses its own custom value.
 *
 * @param subproductLoss - The subproduct's own loss percentage (null = inherit)
 * @param parentLoss - The parent product's loss percentage
 * @returns The effective loss percentage to use
 *
 * @example
 * // Subproduct inherits from parent
 * getEffectiveLossPercentage(null, 15) // Returns 15
 *
 * // Subproduct uses custom value
 * getEffectiveLossPercentage(10, 15) // Returns 10
 */
export function getEffectiveLossPercentage(
  subproductLoss: number | null | undefined,
  parentLoss: number | null | undefined
): number {
  // If subproduct has a custom value, use it
  if (subproductLoss !== null && subproductLoss !== undefined) {
    return subproductLoss;
  }
  // Otherwise inherit from parent, defaulting to 0 if parent has no loss
  return parentLoss ?? 0;
}

/**
 * Check if a subproduct is using an inherited loss rate from its parent.
 *
 * @param subproductLoss - The subproduct's own loss percentage (null = inherited)
 * @returns True if the subproduct is inheriting its loss rate
 */
export function isUsingInheritedLossRate(
  subproductLoss: number | null | undefined
): boolean {
  return subproductLoss === null || subproductLoss === undefined;
}

/**
 * Format a validation error message for insufficient parent stock when ordering subproducts.
 *
 * @param orderQuantity - Quantity of subproduct being ordered
 * @param subproductName - Name of the subproduct
 * @param requiredParentStock - Required parent stock (from calculateParentConsumption)
 * @param parentName - Name of the parent product
 * @param availableParentStock - Available parent stock
 * @param unit - Unit of measurement (e.g., 'kg', 'piece')
 * @returns Formatted error message
 */
export function formatInsufficientStockError(
  orderQuantity: number,
  subproductName: string,
  requiredParentStock: number,
  parentName: string,
  availableParentStock: number,
  unit: string
): string {
  return `Insufficient stock. Ordering ${orderQuantity}${unit} ${subproductName} requires ${requiredParentStock}${unit} of ${parentName} (only ${availableParentStock}${unit} available)`;
}

/**
 * Interface for a subproduct with necessary fields for stock calculations.
 */
export interface SubproductForStockCalc {
  id: string;
  parentProductId: string;
  estimatedLossPercentage: number | null;
}

/**
 * Calculate updated stock values for multiple subproducts after parent stock changes.
 *
 * @param parentStock - New stock level of the parent product
 * @param subproducts - Array of subproducts with loss percentages
 * @returns Array of objects with subproduct id and new calculated stock
 */
export function calculateAllSubproductStocks(
  parentStock: number,
  subproducts: SubproductForStockCalc[]
): Array<{ id: string; newStock: number }> {
  return subproducts.map((subproduct) => {
    const lossPercentage = subproduct.estimatedLossPercentage ?? 0;
    return {
      id: subproduct.id,
      newStock: calculateSubproductStock(parentStock, lossPercentage),
    };
  });
}

/**
 * Calculate updated stock values for multiple subproducts with loss rate inheritance support.
 *
 * This function considers whether each subproduct is using its own loss percentage
 * or inheriting from the parent.
 *
 * @param parentStock - New stock level of the parent product
 * @param parentLossPercentage - Parent product's loss percentage (for inheritance)
 * @param subproducts - Array of subproducts with loss percentages
 * @returns Array of objects with subproduct id and new calculated stock
 */
export function calculateAllSubproductStocksWithInheritance(
  parentStock: number,
  parentLossPercentage: number | null | undefined,
  subproducts: SubproductForStockCalc[]
): Array<{ id: string; newStock: number }> {
  return subproducts.map((subproduct) => {
    const effectiveLoss = getEffectiveLossPercentage(
      subproduct.estimatedLossPercentage,
      parentLossPercentage
    );
    return {
      id: subproduct.id,
      newStock: calculateSubproductStock(parentStock, effectiveLoss),
    };
  });
}
