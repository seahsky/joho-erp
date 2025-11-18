# Project Guidelines

## Core Coding Principles

### KISS (Keep It Simple, Stupid)
- Prioritize simplicity and clarity in all implementations
- Avoid over-engineering solutions
- Choose straightforward approaches over complex abstractions
- Write self-documenting code with clear naming conventions

### DRY (Don't Repeat Yourself)
- Extract common patterns into reusable components and utilities
- Centralize configuration and constants
- Use composition and abstraction to eliminate duplication
- Maintain single sources of truth for data and logic

## Quality Assurance

### Pre-Completion Checklist
Before considering any task complete, always verify:

1. **Build Verification**
   - Run full production build to ensure no build errors
   - Confirm all dependencies are properly resolved
   - Validate build output and artifacts

2. **Type Check**
   - Execute TypeScript type checking across the entire codebase
   - Resolve all type errors and warnings
   - Ensure type safety is maintained throughout

3. **Testing Protocol**
   - Run all build commands to completion
   - Address any errors or warnings that appear
   - Verify no regressions are introduced

## Internationalization (i18n)

### i18n First Principle
All user-facing text MUST be internationalized using next-intl. Never hardcode user-facing strings.

### Implementation Requirements
When creating or modifying components with user-facing text:

1. **Import Translation Hook**
   - Use the useTranslations hook from next-intl
   - Initialize with const t = useTranslations()

2. **Add Translation Keys**
   - Add keys to ALL language files:
     - `/apps/admin-portal/messages/en.json`
     - `/apps/admin-portal/messages/zh-CN.json`
     - `/apps/admin-portal/messages/zh-TW.json`
     - `/apps/customer-portal/messages/en.json`
     - `/apps/customer-portal/messages/zh-CN.json`
     - `/apps/customer-portal/messages/zh-TW.json`

3. **Namespace Organization**
   - Group related translations under feature namespaces
   - Example: `productForm`, `customerManagement`, `orderTracking`
   - Sub-organize by context: `dialog`, `fields`, `buttons`, `messages`, `validation`

4. **Translation Key Naming**
   - Use semantic, descriptive names: `productForm.fields.sku` not `label1`
   - Keep keys lowercase with camelCase
   - Separate concerns: `buttons.save`, `messages.saveSuccess`, `validation.saveError`

5. **Dynamic Content**
   - Use interpolation for variable content
   - Handle pluralization with separate keys for singular/plural
   - Format dates and numbers according to locale

6. **What Must Be Translated**
   - ✅ Dialog/Modal titles and descriptions
   - ✅ Form labels and placeholders
   - ✅ Button text
   - ✅ Toast/notification messages
   - ✅ Validation error messages
   - ✅ Table headers and empty states
   - ✅ Dropdown options
   - ✅ Help text and tooltips
   - ❌ API endpoint URLs
   - ❌ Environment variables
   - ❌ Code comments
   - ❌ Console logs (for debugging)

7. **Pre-Commit i18n Checklist**
   - [ ] All user-facing strings use `t()` function
   - [ ] Translation keys added to all 3 language files (or 6 for both portals)
   - [ ] Tested language switching works
   - [ ] Pluralization works correctly
   - [ ] No hardcoded strings in JSX

### Enforcement
Before marking any task complete, verify i18n compliance. Run `pnpm type-check` and test with all supported languages.

## Monetary Value Handling

### Dinero First Principle
All monetary values MUST use dinero.js for type-safe currency operations. Never use floating-point numbers for money calculations.

### Storage Standard
All monetary values in the database are stored as **integers representing cents**.

- Database Type: `Int` (never Float or Decimal)
- Example: $25.50 is stored as 2550 cents
- Currency: AUD (Australian Dollar) exclusively
- Utilities Location: `/packages/shared/src/utils/money.ts`

### Data Flow Patterns

1. **User Input to Database (Creating/Updating)**
   - User enters dollars in form as string
   - Parse using `parseToCents()` to convert to integer cents
   - Validate the result is not null and meets business rules
   - Send cents to API

2. **Database to Display (Reading)**
   - API returns cents as integer
   - Format using `formatAUD()` for display to users
   - Never expose raw cent values to users

3. **Database to Form Input (Editing)**
   - API returns cents as integer
   - Convert to dollar string using `formatCentsForInput()`
   - User edits the dollar value
   - Parse back to cents on submit using `parseToCents()`

4. **Calculations Using Dinero**
   - Create Money objects from cents using `createMoney()`
   - Perform all calculations using dinero utility functions
   - Extract cents using `toCents()` for storage or API calls

### Required Utilities

Always use these functions from `/packages/shared/src/utils/money.ts`:

1. **Creation & Conversion**
   - `createMoney(cents)` - Create Money object from integer cents
   - `toAUD(dollars)` - Create Money object from decimal dollars
   - `toCents(money)` - Extract cents from Money object
   - `toDollars(money)` - Convert Money object to decimal dollars

2. **Formatting & Display**
   - `formatAUD(money | cents)` - Format as AUD currency string (e.g., "$25.50")
   - `formatCentsForInput(cents)` - Format cents for input fields (e.g., "25.50")

3. **Parsing & Validation**
   - `parseToCents(input)` - Parse user input to cents, returns null if invalid
   - `isValidCents(value)` - Type guard for valid cent amounts

4. **Arithmetic Operations**
   - `addMoney(money1, money2)` - Add two Money objects
   - `subtractMoney(money1, money2)` - Subtract Money objects
   - `multiplyMoney(money, multiplier)` - Multiply by number or ratio object
   - `sumMoney(amounts[])` - Sum array of Money objects

5. **Tax Calculations**
   - `calculateGST(subtotal)` - Calculate 10% Australian GST
   - `calculateTotalWithGST(subtotal)` - Returns object with subtotal, gst, and total

6. **Comparison Operations**
   - `isGreaterThan(money1, money2)` - Compare amounts
   - `isLessThan(money1, money2)` - Compare amounts
   - `isZeroMoney(money)` - Check if amount is zero

7. **Advanced Operations**
   - `allocateMoney(money, ratios[])` - Split money proportionally
   - `getDiscountPercentage(basePrice, discountedPrice)` - Calculate discount percentage

8. **Constants**
   - `ZERO_AUD` - Constant for $0.00 in AUD

### Validation Rules

1. **API Input Validation**
   - Use Zod schema: `z.number().int().positive()` for all price fields
   - Include comments indicating values are in cents
   - Reject negative values, floats, or null/undefined

2. **User Input Validation**
   - Always use `parseToCents()` to validate and convert user input
   - Check for null return value (indicates invalid input)
   - Provide clear error messages for invalid amounts
   - Validate business rules (e.g., minimum order amount, credit limits)

3. **Type Safety**
   - Use `Money` type from money.ts for dinero objects
   - Use `number` type with clear comments for cent values
   - Never mix dollars and cents without explicit conversion

### Calculation Guidelines

1. **When to Use Money Objects**
   - For all arithmetic operations (add, subtract, multiply)
   - For comparisons between monetary values
   - For tax and discount calculations
   - For splitting or allocating amounts

2. **When to Use Raw Cents**
   - Storing values in database
   - Sending/receiving from API endpoints
   - Simple equality checks or null checks
   - Formatting for display (formatAUD accepts both)

3. **Common Operations**
   - **Order Totals**: Use `calculateOrderTotals()` for consistent GST handling
   - **Custom Pricing**: Use `getEffectivePrice()` for customer-specific discounts
   - **Item Subtotals**: Use `multiplyMoney()` for quantity × price
   - **Credit Limits**: Store and compare as raw cents
   - **Bulk Discounts**: Create Money objects for percentage calculations

### Pre-Commit Monetary Checklist

Before considering any monetary task complete, verify:

- [ ] All monetary values stored as integer cents in database
- [ ] All database price fields are type `Int` (not Float or Decimal)
- [ ] User inputs parsed with `parseToCents()` before API calls
- [ ] Display values formatted with `formatAUD()` or `formatCentsForInput()`
- [ ] Calculations use dinero.js Money objects and utility functions
- [ ] API endpoints validate with `z.number().int().positive()` schema
- [ ] No floating-point arithmetic on monetary values
- [ ] All monetary fields have comments indicating "in cents"
- [ ] Tested with edge cases: zero amounts, large amounts, rounding scenarios
- [ ] No hardcoded currency symbols or formats (use formatAUD)

### Common Mistakes to Avoid

- ❌ Storing dollars as Float or Decimal in database
- ❌ Using JavaScript math operators directly on currency values
- ❌ Displaying raw cent values to users (e.g., showing "2550" instead of "$25.50")
- ❌ Sending dollar values to API expecting cents (or vice versa)
- ❌ Using deprecated `formatCurrency()` function (use `formatAUD()` instead)
- ❌ Manual percentage calculations instead of dinero utilities
- ❌ Mixing currencies or assuming USD instead of AUD
- ❌ Forgetting to validate `parseToCents()` return value for null
- ❌ Not handling GST consistently across the application
- ❌ Using string concatenation for currency formatting

### Enforcement
Before marking any task complete, verify monetary handling compliance. Run `pnpm type-check` and test with edge cases including zero, large amounts, and rounding scenarios.

## Project Logic

This is a Next.js-based ERP system with the following structure:

- **Framework**: Next.js with App Router
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS for utility-first styling
- **Components**: Modular, reusable React components
- **Layout**: Admin layout with sidebar navigation
- **Authentication**: User-based access control

### Development Workflow
1. Implement features following KISS and DRY principles
2. Ensure TypeScript types are properly defined
3. Test builds frequently during development
4. Run type checks before finalizing changes
5. Verify all commands execute successfully
