# TAIS Platform Changelog

All notable changes to the TAIS Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed - Code Quality & Architecture Improvements (Mar 17, 2026)
- **Database Client Consistency** - Centralized configuration management with validated environment variables
- **Prisma Client Usage** - All routes now consistently use `req.prisma` instead of creating new clients
- **Session Management** - RAG sessions now use database-backed storage instead of in-memory Map for scalability
- **Error Handling** - Standardized on `req.log?.` pattern throughout codebase
- **Wallet Address Handling** - Created wallet normalization utilities and applied consistently
- **Middleware & Security** - Standardized middleware chaining and fixed security gaps
- **Configuration Clarity** - Eliminated confusing dual DATABASE_URL vs RAG_DATABASE_URL vs SKILLS_DATABASE_URL usage

### Added - API Contract & Client Generation (Mar 17, 2026)
- **OpenAPI Specification** - Generated OpenAPI 3.0 spec from backend route definitions (`packages/registry/docs/openapi.json`)
- **Typed API Client** - Created typesafe client (`tais_frontend/src/api/client.ts`) for all internal API calls
- **Service Refactor** - Refactored service layers to use typed client: authApi, configApi, memoryAPI, oauthApi, ragApi, rcrtApi
- **Component Updates** - Updated UI components to use typed client: GoldTierDashboard, MonitoringDashboard, PlatformSettings, DeveloperPortal
- **Request Consistency** - All internal API calls now go through the typed client, eliminating direct fetch/axios usage
- **Security Improvements** - Centralized auth header injection, reduced surface for injection attacks
- **Maintainability** - Single source of truth for API contract via OpenAPI spec

## [3.4.0] - 2026-03-09