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
   ```typescript
   import { useTranslations } from 'next-intl';
   const t = useTranslations();
   ```

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
   - Use interpolation: `t('message', { count: 5, name: 'Product' })`
   - Handle pluralization: separate keys for singular/plural
   - Format dates/numbers according to locale

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

### Example Pattern
```typescript
// ❌ BAD - Hardcoded strings
<Dialog>
  <DialogTitle>Add New Product</DialogTitle>
  <DialogDescription>Create a new product</DialogDescription>
  <Button>Save</Button>
</Dialog>

// ✅ GOOD - Internationalized
const t = useTranslations();

<Dialog>
  <DialogTitle>{t('productForm.dialog.title')}</DialogTitle>
  <DialogDescription>{t('productForm.dialog.description')}</DialogDescription>
  <Button>{t('productForm.buttons.save')}</Button>
</Dialog>
```

### Enforcement
Before marking any task complete, verify i18n compliance. Run `pnpm type-check` and test with all supported languages.

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
