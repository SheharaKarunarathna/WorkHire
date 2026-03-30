BEGIN;

create extension if not exists pgcrypto; /* From pgcrypto we generate random UUIDs Universal unique identifiers for our users and posts. This way we don't have to worry about collisions and we can easily generate new IDs without having to query the database for the last ID. */
create extension if not exists citext; /* Since we are going to use emails as unique identifiers for users, we need to make sure that the email column is case-insensitive. So whether typed from upper or lower doesn't matter */

DO $$ /*Raw SQL CREATE TYPE doesn't support IF NOT EXISTS syntax before PostgreSQL 13. That's why we put the logic in a DO block */
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_role') THEN
        CREATE TYPE account_role AS ENUM ('user', 'worker', 'admin');
    END IF;
END
$$;


CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email CITEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    phone CHAR(10) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

/* Since a single user can be a user, worker and admin aswell we need to make it is possible to have many roles per person. That's why another table for roles is made here. We also use a composite primary key of account_id and role to make sure that a user can't have the same role twice. */
CREATE TABLE IF NOT EXISTS account_roles (
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, /* on delete cascade makes sure that when an account is deleted, all its roles are also deleted */
    role account_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (account_id, role)
);

COMMIT;

