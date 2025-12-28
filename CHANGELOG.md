# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project structure with Turborepo monorepo
- Shared TypeScript types package
- MCP Server backend with Supabase integration
- PostgreSQL database schema with Row Level Security
- Recipe CRUD operations
- Meal planning functionality
- Shopping list generation
- User profile and preferences management
- Comprehensive documentation (README, QUICKSTART, ROADMAP)

### Database
- Users table with auth provider support
- Recipes table with JSONB ingredients
- Meal plans table with date-based planning
- Shopping lists table
- Shared recipes table for community features
- User preferences table
- Full-text search on recipes (Swedish language support)
- Automatic triggers for updated_at timestamps
- Share code generation for recipe sharing

### Security
- Row Level Security policies on all tables
- Users can only access their own data
- Public recipes visible to all authenticated users
- Secure authentication via Supabase Auth

## [0.1.0] - 2025-12-28

### Initial Release
- Project foundation established
- Backend architecture complete
- Database schema deployed
- Ready for frontend development
