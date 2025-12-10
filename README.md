# Joho Foods ERP System

A dual-portal ERP system for Joho Foods, an Australian B2B meat distributor, built with Next.js, tRPC, and MongoDB.

## Project Structure

This is a monorepo managed with npm workspaces and Turbo.

```
joho-foods-erp/
├── apps/
│   ├── customer-portal/    # Customer-facing application (port 3000)
│   └── admin-portal/        # Admin/operations application (port 3001)
├── packages/
│   ├── api/                 # tRPC API procedures
│   ├── database/            # MongoDB schemas & models
│   ├── email/               # Email templates & service (TODO)
│   ├── shared/              # Shared types, utils, constants
│   └── ui/                  # Shared UI components (TODO)
└── docs/                    # Documentation
```

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TailwindCSS
- **API**: tRPC 10 for type-safe APIs
- **Database**: MongoDB with Mongoose
- **Authentication**: Clerk
- **Email**: Resend (TODO)
- **File Storage**: Vercel Blob or AWS S3 (TODO)
- **Accounting**: Xero API integration (TODO)

## Getting Started

### Prerequisites

- Node.js 18.17.0 or later
- npm 9.0.0 or later
- MongoDB database (Atlas or local)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd joho-erp
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your credentials:
- MongoDB connection string
- Clerk API keys
- Other service API keys as needed

### Development

Run both portals in development mode:

```bash
npm run dev
```

This will start:
- Customer Portal: http://localhost:3000
- Admin Portal: http://localhost:3001

Run a specific portal:

```bash
# Customer portal only
cd apps/customer-portal && npm run dev

# Admin portal only
cd apps/admin-portal && npm run dev
```

### Building

Build all apps:

```bash
npm run build
```

## Features

### Customer Portal

- Customer registration and credit application
- Product catalog with customer-specific pricing
- Order placement with cutoff time validation
- Order history and tracking
- Profile management

### Admin Portal

- Dashboard with key metrics
- Customer management and credit approval
- Product and inventory management
- Customer-specific pricing management
- Order processing and status updates
- Packing interface for warehouse staff
- Delivery management with proof of delivery
- Xero accounting integration (TODO)

## Database Models

- **Company**: Business settings and configuration
- **Customer**: Customer profiles and credit applications
- **Product**: Product catalog with inventory
- **CustomerPricing**: Customer-specific pricing rules
- **Order**: Order details and status tracking
- **InventoryTransaction**: Stock movement audit trail
- **AuditLog**: System audit trail
- **SuburbAreaMapping**: Delivery area mapping
- **SystemLog**: Application logs

## User Roles

- **Customer**: Place orders, view products, track deliveries
- **Admin**: Full system access
- **Sales**: Customer and pricing management
- **Packer**: Access to packing interface
- **Driver**: Access to delivery interface
- **Manager**: Read-only access and reports

## API Routes

All API routes are type-safe with tRPC:

- `customer.*` - Customer registration, profile, credit
- `product.*` - Product catalog and management
- `order.*` - Order creation and management

## Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow the existing project structure
- Use ESLint and Prettier for code formatting

### Commit Messages

Follow conventional commits:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Test additions/changes

### Pull Requests

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all tests pass: `npm run type-check`
4. Submit a pull request with clear description

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Configure environment variables
3. Deploy both apps as separate Vercel projects

### Environment Variables

See `.env.example` for required environment variables.

## Testing

```bash
# Type checking
npm run type-check

# Linting
npm run lint
```

## License

Proprietary - All rights reserved

## Support

For questions or issues, contact the development team.
