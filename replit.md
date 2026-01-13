# ERPLite - Small Scale Industry ERP System

## Overview

ERPLite is a lightweight, Excel-driven ERP web application designed for small scale industries. The system provides inventory management, purchase tracking, production workflows, and financial reporting capabilities. The core philosophy is to replicate existing Excel-based workflows in a web interface, maintaining familiar calculation patterns while adding database persistence and multi-user access.

The application manages master data (items, warehouses, suppliers, categories), transactions (purchases, issues, payments), production runs, and generates stock reports with export capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom Excel-green theme
- **Charts**: Recharts for dashboard analytics
- **Forms**: React Hook Form with Zod validation
- **Animations**: Framer Motion for smooth transitions

The frontend follows a page-based structure with a persistent sidebar navigation. Each major module (Dashboard, Masters, Transactions, Production, Reports) has its own page component.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **API Style**: REST endpoints organized by resource
- **Build Tool**: Vite for development, esbuild for production bundling

The server follows a layered architecture:
- `routes.ts` - API endpoint definitions
- `storage.ts` - Data access layer with business logic
- `db.ts` - Database connection management

### Data Storage
- **Database**: PostgreSQL via Neon serverless
- **ORM**: Drizzle ORM with type-safe schema definitions
- **Schema Location**: `shared/schema.ts` (shared between client and server)
- **Migrations**: Drizzle Kit for schema management

Key database tables:
- Masters: `items`, `categories`, `warehouses`, `suppliers`, `units_of_measure`, `expense_heads`, `owners`, `payment_methods`
- Transactions: `purchases`, `purchase_line_items`, `issues`, `opening_stock`, `owner_payments`
- Production: `production_runs`, `production_inputs`

### Shared Code Pattern
The `shared/` directory contains code used by both frontend and backend:
- `schema.ts` - Drizzle table definitions and Zod insert schemas
- `routes.ts` - API route definitions with input/output schemas for type safety

### Build and Development
- Development: `npm run dev` - runs Vite dev server with HMR
- Production: `npm run build` - bundles client with Vite, server with esbuild
- Database: `npm run db:push` - pushes schema changes to database

## External Dependencies

### Database
- **Neon PostgreSQL**: Serverless Postgres database accessed via `@neondatabase/serverless`
- **Connection**: Requires `DATABASE_URL` environment variable

### UI Component Libraries
- **Radix UI**: Full suite of accessible primitives (dialog, dropdown, tabs, etc.)
- **shadcn/ui**: Pre-built component configurations in `client/src/components/ui/`

### Key Runtime Dependencies
- **drizzle-orm**: Type-safe database queries
- **drizzle-zod**: Schema validation integration
- **zod**: Runtime type validation for API inputs
- **date-fns**: Date formatting for reports and tables
- **recharts**: Dashboard visualizations
- **xlsx**: Excel file export functionality (referenced in build script)

### Development Tools
- **Vite**: Development server and client bundler
- **esbuild**: Production server bundler
- **TypeScript**: Type checking across the full stack
- **Tailwind CSS**: Utility-first styling with PostCSS

### Replit-Specific Integrations
- `@replit/vite-plugin-runtime-error-modal`: Error overlay in development
- `@replit/vite-plugin-cartographer`: Development tooling
- `@replit/vite-plugin-dev-banner`: Development mode indicator