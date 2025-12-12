# Customer Portal - Product Image Display Analysis

## Overview
The customer portal displays products in a list and detail view. Currently, product images are NOT being rendered in the UI despite having image URL storage infrastructure in place.

## Database Schema
**Location**: `/packages/database/prisma/schema.prisma` (lines 144-171)

```
model Product {
  id                String
  sku               String @unique
  name              String
  description       String?
  category          ProductCategory?
  unit              ProductUnit
  packageSize       Float?
  basePrice         Int                 // cents
  currentStock      Float
  lowStockThreshold Float?
  status            ProductStatus
  xeroItemId        String?
  imageUrl          String?             // R2 public URL for product image
  createdAt         DateTime
  updatedAt         DateTime
}
```

**Key Field**: `imageUrl` (line 157) - Optional string storing R2 public URLs for product images

## Data Fetching Flow

### API Router
**Location**: `/packages/api/src/routers/product.ts`

- `getAll` procedure (lines 11-85): Fetches products with optional search/category filtering
  - Returns full product objects including imageUrl field
  - Customer-specific pricing applied if user authenticated
  
- `getById` procedure (lines 88-133): Fetches single product by ID
  - Returns full product object including imageUrl

### Product Data Returned
The product queries return all fields from the Product model, including `imageUrl`:
```typescript
return products.map((product) => ({
  ...product,
  ...priceInfo,
}));
```

## Customer Portal Product Display

### 1. Product List Component
**Location**: `/apps/customer-portal/app/[locale]/products/components/product-list.tsx`

**Key Points**:
- Line 32: Fetches products via `api.product.getAll.useQuery()`
- Lines 163-304: Maps products in a grid/list layout
- Currently uses generic Package icon instead of actual product images
- Desktop layout (lines 176-244): Displays Package icon in 16x16 container
- Mobile layout (lines 246-301): Displays Package icon in 14x14 container

**NO IMAGE RENDERING**: Product images are not being displayed despite available imageUrl field

### 2. Product Detail Sidebar
**Location**: `/apps/customer-portal/app/[locale]/products/components/product-detail-sidebar.tsx`

**Key Points**:
- Lines 113-117: Product image section defined
- Currently shows placeholder with Package icon and gradient background
- NO IMAGE RENDERING: Despite imageUrl being available in product data

**Current Code** (lines 114-117):
```tsx
<div className="relative bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 rounded-2xl overflow-hidden aspect-square flex items-center justify-center group">
  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
  <Package className="h-32 w-32 text-neutral-400 dark:text-neutral-600 transition-transform duration-300 group-hover:scale-110" />
</div>
```

## Image Upload Infrastructure (Admin Portal)

### Upload Router
**Location**: `/packages/api/src/routers/upload.ts`

Procedures:
1. `getProductImageUploadUrl` (lines 38-84)
   - Generates presigned URLs for R2 uploads
   - Admin only
   - Accepts: productId, filename, contentType, contentLength
   - Returns: { uploadUrl, publicUrl, key, expiresIn }

2. `deleteProductImage` (lines 90-114)
   - Deletes images from R2
   - Accepts imageUrl
   - Returns: { success: true }

### R2 Storage Service
**Location**: `/packages/api/src/services/r2.ts`

Configuration:
- Bucket: Environment variable `R2_BUCKET_NAME`
- Public URL: Environment variable `R2_PUBLIC_URL`
- Max file size: 2MB
- Allowed types: JPEG, PNG, WebP
- Presigned URL expiry: 5 minutes

Key Functions:
1. `generateUploadUrl()` (lines 65-106)
   - Creates unique key: `products/{productId}/{timestamp}-{sanitizedFilename}`
   - Returns presigned PUT URL for client-side upload
   - Constructs public URL: `${R2_PUBLIC_URL}/${key}`

2. `deleteImage()` (lines 111-125)
   - Extracts key from URL and deletes from R2

3. `isR2Configured()` (lines 34-42)
   - Checks if all R2 environment variables are set

### Admin Product Dialogs
**Add Product Dialog**: `/apps/admin-portal/app/[locale]/(app)/products/components/AddProductDialog.tsx`

Key implementation (lines 77-141):
- Image upload state: `const [imageUrl, setImageUrl] = useState<string | null>(null)`
- Compression: Uses `browser-image-compression` library
  - Max 1MB, 1200px max dimension, converts to JPEG
- Upload flow:
  1. Get presigned URL from API
  2. Upload compressed image to R2 via presigned URL
  3. Returns public URL from R2
- Image deletion integrated
- `imageUrl` passed to create mutation (line 350)

## Summary of Current State

### What's Implemented
✅ Database field for imageUrl (optional String)
✅ API returns imageUrl in product queries
✅ R2 storage infrastructure (upload, delete, presigned URLs)
✅ Admin portal can upload and manage product images
✅ Image compression and validation on upload

### What's Missing
❌ Customer portal NOT rendering product images
❌ No Next.js Image component usage for optimization
❌ No fallback UI when image unavailable
❌ No image loading/error states
❌ No CDN configuration for image delivery

## Component UIs Without Images
1. Product List (Desktop): 16x16 Package icon
2. Product List (Mobile): 14x14 Package icon  
3. Product Detail Sidebar: 32x32 Package icon with gradient

All use placeholder icons instead of rendering imageUrl from product data.

## Next Steps for Implementation
To display product images in customer portal:
1. Add Next.js Image component imports
2. Create conditional rendering: imageUrl ? <Image> : <PackageIcon>
3. Add image error boundaries and loading states
4. Optimize images with Next.js Image for performance
5. Add alt text (use product name)
6. Handle missing/invalid URLs gracefully
