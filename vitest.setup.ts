/* Test environment defaults. Real DATABASE_URL / REDIS_URL can be supplied via
 * the shell to enable the integration tests; otherwise dummy values let the
 * unit tests import bot modules (which validate env at load) without failing. */
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL ??= 'silent';
process.env.DISCORD_TOKEN ??= 'test.token.value';
process.env.DISCORD_CLIENT_ID ??= '100000000000000000';
process.env.OWNER_IDS ??= '111111111111111111';
process.env.DATABASE_URL ??= 'postgresql://helios:helios@localhost:5432/helios?schema=public';
process.env.REDIS_URL ??= 'redis://localhost:6379';
