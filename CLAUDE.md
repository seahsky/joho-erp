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
