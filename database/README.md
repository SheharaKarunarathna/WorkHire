# WorkHire Database Starter (PostgreSQL)

This folder gives you a normalized PostgreSQL baseline aligned with your SRS.

## Files

- schema.sql: DDL, constraints, and indexes.
- transactions.sql: Transaction-safe workflows for request and bidding lifecycle.
- erd.md: Mermaid ER diagram for quick visualization.

## Normalization Decisions (3NF)

- Identity separated from behavior:
  - accounts stores common login and profile basics.
  - user_profiles and worker_profiles hold role-specific attributes.
- Many-to-many skill model:
  - service_categories + worker_skills replaces array-based skills.
- Time-slot model:
  - worker_availability_slots avoids repeated availability fields and supports booking windows.
- Event/history isolation:
  - request_status_history and notifications capture changes without duplicating mutable request state.

## Optimization Features Included

- Partial unique index enforcing one accepted bid per request.
- Composite indexes on request lifecycle and bid listing access patterns.
- GIN index on JSONB notification payload for flexible querying.
- Check constraints for coordinate, rating, budget, and interval integrity.
- Domain enums for compact, validated state transitions.

## How To Apply

```sql
-- run from psql
\i database/schema.sql
\i database/transactions.sql
```

## Recommended Next Optimization Steps

1. Add PostGIS (geometry Point SRID 4326 columns + GiST indexes) for accurate nearest-worker search.
2. Add trigger/function to auto-maintain updated_at on mutable tables.
3. Add query-level observability (pg_stat_statements) and baseline slow query thresholds.
4. Introduce partitioning for notifications and request_status_history when row counts grow.
