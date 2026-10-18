# Phase 3 — Database Architecture, Schema Drift and Migration Audit

I am auditing the Punjab Industries Survey App, built with React/Vite, NestJS, TypeORM and PostgreSQL/PostGIS.

Previous read-only investigations identified potential inconsistencies between:
- `database/schema.sql`
- `database/seed.sql`
- `SETUP_DATABASE.bat`
- Legacy SQL scripts and migrations
- TypeORM entity definitions
- Backend services and their actual database queries

Your task is to establish the repository's intended database architecture and identify schema drift, migration hazards and data-integrity problems.

## Safety requirements

- Perform a read-only investigation.
- Do not modify or generate project files.
- Do not execute SQL against any database.
- Do not install dependencies or run migrations.
- Do not expose credentials.
- Do not assume that every SQL file is intended to run in sequence.
- Trace the actual setup sequence before declaring a migration defective.

## 1. Establish the Canonical Database Setup

Inspect `SETUP_DATABASE.bat`, all database scripts, backend configuration and repository documentation.

Determine:
- Which scripts run during a fresh installation, and in what order.
- Which scripts appear to be legacy, optional, incremental or obsolete.
- Whether setup can be repeated safely.
- Whether seed operations are idempotent.
- Whether scripts depend on objects created by other scripts.
- Whether any script drops, recreates or destructively modifies tables.
- Whether the application has a formal migration mechanism or relies on manually executed SQL.

Produce a dependency-ordered map of the database setup process, based on actual evidence.

## 2. Compare TypeORM Entities Against SQL

Inspect every entity under `backend/src/dal/entities/` and compare it with the canonical schema and relevant migrations.

Check:
- Table and column names
- Data types and maximum lengths
- Nullable versus non-nullable columns
- Primary keys and generated IDs
- Foreign keys and delete/update behavior
- Unique constraints and CHECK constraints
- Default values
- Enum representations
- Spatial geometry types and SRIDs
- Indexes and composite indexes
- Timestamp and audit fields

Create a discrepancy matrix:

| Table | Entity file | SQL definition | Discrepancy | Runtime consequence | Evidence |
|---|---|---|---|---|---|

Distinguish harmless mapping differences from actual runtime failures or data-integrity risks.

Do not infer that a table is unused merely because no obvious entity exists. Search all raw SQL queries and service references.

## 3. Trace Important Business Data Relationships

Build the actual relationships for:
- Users, roles and permissions
- Survey forms, sections, questions and answer options
- Survey responses and normalized answer tables
- Industrial units and geographic classifications
- Duplicate flags
- Approval logs
- Survey attachments
- Sync logs
- District, tehsil, sector and industrial-estate reference data

For each relationship, establish:
- The owning table
- The foreign key or application-level relationship
- Whether referential integrity is enforced by PostgreSQL
- Whether orphaned records are possible
- Whether deletion or updates can cascade unexpectedly

Pay special attention to approval consistency, surveyor attribution and duplicate detection.

## 4. Investigate the Existing Findings

Recheck these issues against the canonical SQL and all relevant legacy scripts:

A. The `duplicate_flags.reason` contract mismatch.

B. The frontend's hard-coded role IDs versus the role IDs created by the fresh-install process.

C. Approval operations that update the unit, write an approval log and update a response separately.

D. Survey response idempotency and database uniqueness constraints.

E. The `survey_attachments` table and whether the current application can persist and retrieve attachments.

F. Any mismatch between the TypeORM entities and normalized answer tables used by raw SQL.

For each finding, state whether it applies to:
- Canonical fresh installation
- Legacy installation paths
- Both
- Unknown without inspecting the live database

## 5. Assess Data Integrity and Performance

Inspect database constraints, indexes and query patterns for:
- Duplicate survey responses
- Duplicate industrial-unit records
- Missing or invalid foreign keys
- Approval state transitions
- Repeated or conflicting survey submissions
- Slow spatial queries
- Unbounded queries and missing pagination
- N+1 query patterns
- Missing indexes on frequently filtered or joined columns
- Potentially expensive `ST_Distance`, `ST_DWithin` and name-similarity operations

Do not claim a query is slow without benchmarks. Separate structural concerns from performance problems that require measurement.

## 6. Produce a Safe Remediation Plan

Do not implement fixes.

For every confirmed issue, provide:
- Severity and evidence
- Affected database objects
- Whether existing data could be affected
- Required schema changes, if any
- Required application-code changes
- Migration ordering and dependencies
- Backward-compatibility concerns
- Backup and rollback considerations
- Verification queries that could be run later in a safe test environment
- Regression tests

Avoid recommending destructive table recreation when an incremental migration is appropriate.

## Required deliverables

1. Canonical database setup flow.
2. Entity-to-schema discrepancy matrix.
3. Business relationship map.
4. Confirmed database and migration findings.
5. Risks associated with legacy schema paths.
6. Prioritized, non-destructive remediation plan.
7. List of questions that require the actual deployed database to answer.

Include exact file paths and line numbers. Clearly label unverified assumptions. Do not claim to have inspected a live database or executed SQL.

Finish with a concise explanation of which schema or migration risks should be resolved before implementing the previously identified security and synchronization fixes.