# Deep Code Audit — Authentication, RBAC & Offline Synchronization

## Project Context
I am conducting a comprehensive technical audit of the Punjab Industries Survey App, built with:

- **Frontend:** React, TypeScript, Vite, PWA
- **Offline storage:** IndexedDB and browser localStorage
- **Backend:** NestJS, TypeScript, REST API
- **Database:** PostgreSQL with TypeORM
- **Authentication:** JWT and bcrypt
- **Architecture:** Controllers → Services → Database layer

The application supports field surveyors who collect industrial-unit survey data offline and synchronize it with the backend when connectivity returns. Supervisors review, approve, or reject industrial units, while administrators manage users.

## Your Mission

Perform a detailed, read-only audit of the actual source code in the current workspace.

**Do not modify, create, delete, or format any project files. Do not install packages, execute database mutations, or change configuration.**

Do not assume the existing documentation, comments, permission constants, or previous AI summaries are correct. Trace the implementation and establish what the code actually does.

## Investigation 1: Authentication and JWT Security

Trace the complete authentication lifecycle across the frontend and backend.

Inspect:
- Login controller and service
- Password verification and password hashing
- JWT signing and verification
- JWT payload structure, expiration, issuer and audience configuration, where applicable
- Authentication guards and request-user population
- Frontend AuthContext and API client
- Token storage, logout behavior, unauthorized responses and session restoration
- User activation/deactivation and whether inactive users can continue using existing tokens
- Registration authorization and input validation
- Password handling in database entities, API responses and logs

Determine:
1. Can unauthenticated users access protected endpoints?
2. Can an expired, malformed or improperly signed JWT be accepted?
3. Are JWT secrets loaded securely and validated at startup?
4. Can a deactivated user continue using an existing token?
5. Is sensitive user information exposed in responses or browser storage?
6. Does the application have any actual token revocation or session invalidation mechanism?

Do not label a behavior vulnerable without explaining the relevant code path and conditions.

## Investigation 2: Role-Based Access Control (RBAC)

Trace the complete authorization chain:

Frontend permissions → JWT claims → backend guards → controller decorators → service-level checks → database operations.

Inspect all controllers, guards, decorators, permission definitions and relevant services.

Build a table containing:

| HTTP method | Route | Authentication required | Required permission | Additional resource-level check | Actual behavior |
|---|---|---|---|---|---|

Include every declared route, including public endpoints.

Verify:
- Whether every protected route enforces authentication
- Whether permission decorators are correctly interpreted by the guard
- Whether missing permission metadata accidentally permits access
- Whether permissions embedded in JWTs become stale after permission changes
- Whether users can access or modify records outside their authorized scope
- Whether industrial-unit IDs can be enumerated to retrieve or review unauthorized records
- Whether the frontend's navigation restrictions are incorrectly relied upon for security
- Whether the user-management operations enforce appropriate privileges

Distinguish confirmed vulnerabilities from design limitations and unverified concerns.

## Investigation 3: Offline Synchronization and Data Integrity

Trace a survey response from creation in the frontend through its complete lifecycle:

SurveyPage → IndexedDB → pending response → SyncPage → API client → POST /sync → controller → service → TypeORM/PostgreSQL → API response → IndexedDB status update.

Inspect the actual implementation of:
- Client-generated response UUIDs
- Pending, syncing, synced and failed states
- Batch request construction and size limits
- Server-side validation of survey responses
- Duplicate detection and idempotency
- Question IDs and form-version validation
- Industrial-unit creation or linking
- Duplicate-unit detection and review flags
- GPS coordinates, photographs and structured answers
- Database transactions and error handling
- Retry logic and partial batch failures
- Client acknowledgement and synchronization history

Answer these specific questions:

1. Can retrying a request create duplicate survey responses or industrial units?
2. Is idempotency enforced by application code alone or also by database constraints?
3. What happens when a batch contains both valid and invalid responses?
4. Can the server save a response but the frontend mark it as failed, or vice versa?
5. Can concurrent sync requests create race conditions?
6. Are survey answers validated against the authoritative active form on the server?
7. Can an outdated client submit an incompatible form version?
8. Are GPS coordinates, question IDs, answer types and required fields validated server-side?
9. Are photos stored as files, data URLs, base64 strings, external URLs or another representation?
10. Are request-size limits and batch limits appropriate for the largest legitimate payload?
11. Are database writes atomic across responses, answers and industrial-unit records?
12. What happens if the network disconnects after the server commits the transaction but before the client receives the response?

For each question, cite the actual implementation and explain the practical consequences.

## Investigation 4: Frontend Persistence and Failure Recovery

Inspect the IndexedDB implementation and all relevant frontend contexts and pages.

Determine:
- The database schema, object stores, indexes and version-upgrade behavior
- Whether upgrades preserve existing offline surveys
- How drafts and completed-but-unsynced responses are distinguished
- Whether simultaneous tabs or repeated user actions can corrupt state
- Whether pending records survive refreshes, browser restarts and network failures
- Whether sync status transitions are reliable
- What happens after logout, account switching or token expiration
- Whether localStorage and IndexedDB contain sensitive information
- Whether stale cached questionnaires can be submitted accidentally

Identify data-loss scenarios and explain how to reproduce them safely without altering production data.

## Investigation 5: Input Validation and API Contracts

Compare frontend request construction against backend DTOs, validation decorators, controller signatures and service expectations.

Identify:
- Mismatched permission names or outdated comments
- Request and response shape mismatches
- Missing DTO validation
- Unsafe type coercion
- Unbounded arrays, strings or nested objects
- Unexpected fields accepted from clients
- Inconsistent HTTP status codes and error formats
- Missing pagination or limits on list endpoints
- Potential SQL injection or unsafe raw-query construction, if present

Pay particular attention to the discrepancy previously observed between the frontend's SYNC_DATA comment/constant and the backend's SURVEY_SUBMIT permission. Verify whether it is only a misleading comment or causes an actual behavioral defect.

## Investigation 6: Automated Tests and Verification

Inspect existing tests, package scripts, dependency versions and CI workflows.

Report:
- Existing authentication, authorization and sync tests
- Critical missing unit and integration tests
- Whether tests exercise actual guard behavior
- Whether concurrency and retry scenarios are covered
- Whether the project has linting, type checking and build verification
- Whether dependencies or configuration indicate significant security concerns

Do not run destructive tests, access production systems, expose secrets, or install packages.

## Required Output Format

### A. Executive Summary
Give a concise overview of the most important confirmed findings and overall risk areas.

### B. Verified Architecture and Execution Flows
Explain the real authentication, authorization and synchronization flows using actual file paths and function names.

### C. API Authorization Matrix
List every declared route and its effective authorization requirements.

### D. Findings Register
For each finding, include:

- Finding ID
- Severity: Critical / High / Medium / Low / Informational
- Status: Confirmed / Suspected / Not Reproducible / Not Assessed
- File path and exact line numbers
- Relevant function, method or decorator
- Evidence from the implementation
- Reproduction scenario
- Practical impact
- Recommended remediation
- Suggested regression test

Use severity based on realistic exploitability and impact. Do not inflate severity.

### E. Offline Data Integrity Analysis
Explain idempotency, transaction boundaries, partial failures, concurrency and recovery behavior in detail.

### F. Test Coverage Gaps
Prioritize missing tests by risk reduction and implementation effort.

### G. Prioritized Remediation Plan
Group recommendations into:
1. Immediate security fixes
2. Data integrity and offline reliability
3. API and frontend correctness
4. Performance and maintainability

### H. Remaining Unknowns
Explicitly list questions that cannot be answered from source inspection alone, such as production infrastructure, actual database constraints, deployment secrets, runtime behavior or load-test results.

## Evidence and Accuracy Rules

- Inspect the source files, not just README files or comments.
- Include exact file paths and line numbers for every substantive finding.
- Trace calls across layers before concluding that a defect exists.
- Clearly distinguish observed behavior from inferred risk.
- If a file is unavailable, state that instead of inventing its contents.
- Do not reproduce actual passwords, secrets, tokens, connection strings or sensitive production data.
- Do not claim that a test passed unless you actually ran it.
- Do not change any files or fix issues during this investigation.
- Avoid generic recommendations unless they are connected to a specific finding in this codebase.

Start by identifying the repository structure and locating the relevant source files. Then conduct the investigation and deliver the complete report.