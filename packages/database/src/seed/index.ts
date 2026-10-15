/**
 * SSI intentionally never bootstraps an account with shared credentials.
 *
 * This script is kept as a compatibility no-op for older docker-entrypoint
 * invocations and `db:setup`; do not add a universal login or demo password.
 * The real user creates their own credentials through /auth/sign-up.
 *
 * For reproducible integration data use scoped fixtures inside rolled-back
 * transactions, never a seeded privileged account.
 */
console.info("SSI demo-user seeding is disabled. Register through /auth/sign-up.")
