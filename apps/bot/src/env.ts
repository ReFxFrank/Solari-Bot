import { botEnvSchema, parseEnv, type BotEnv } from '@helios/shared';

/** Validated bot environment. Throws at startup if anything is missing. */
export const env: BotEnv = parseEnv(botEnvSchema);
