# TAIS Platform Changelog

All notable changes to the TAIS Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed - TypeScript Build Errors & Navigation Consistency (Mar 19, 2026)
- **Build Fixes** - Resolved TypeScript compilation errors in registry package that prevented Render deployment
  - Fixed skill creation to use correct Prisma model fields
  - Resolved analytics service type mismatches
  - Fixed configuration versioning JsonValue assignment
  - Corrected CTO Agent service method names and types
  - Fixed NFT verification service exports
  - Updated NFT auth middleware to use correct service methods
  - Fixed weekly insights email service import
  - Corrected RAG session query parameter handling
  - Updated validation schemas to include missing fields
- **Frontend Consistency** - Changed 'Home' to 'Back' throughout frontend for consistent navigation
  - Updated ErrorBoundary.tsx: Changed 'Go Home' button to 'Back'
  - Updated MemoryArchivePage.tsx: Changed home button tooltip from 'Go to Home' to 'Go back'

## [3.4.4] - 2026-03-19
### Fixed
- Resolved TypeScript compilation errors preventing Render deployment
- Fixed navigation consistency (Home → Back buttons)
- Improved error handling in session auth middleware
- Fixed NFT service method references in middleware
- Corrected Prisma client usage in CTO Agent service

## [3.4.0] - 2026-03-09

### Added - API Contract & Client Generation (Mar 17, 2026)
- **OpenAPI Specification** - Generated OpenAPI 3.0 spec from backend route definitions (`packages/registry/docs/openapi.json`)
- **Typed API Client** - Created typesafe client (`tais_frontend/src/api/client.ts`) for all internal API calls
- **Service Refactor** - Refactored service layers to use typed client: authApi, configApi, memoryAPI, oauthApi, ragApi, rcrtApi
- **Component Updates** - Updated UI components to use typed client: GoldTierDashboard, MonitoringDashboard, PlatformSettings, DeveloperPortal
- **Request Consistency** - All internal API calls now go through the typed client, eliminating direct fetch/axios usage
- **Security Improvements** - Centralized auth header injection, reduced surface for injection attacks
- **Maintainability** - Single source of truth for API contract via OpenAPI spec

## [3.4.0] - 2026-03-09