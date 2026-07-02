import { Events } from 'discord.js';
import { defineEvent } from '../framework/event';
import { upsertGuildMeta } from '../lib/guildSync';
import { cacheGuildInvites } from '../modules/inviteTracking';
import { sendGuildWelcome } from '../modules/onboarding';

export default defineEvent({
  name: Events.GuildCreate,
  async execute(ctx, guild) {
    // Metadata mirror first so the welcome's dashboard link resolves to a real
    // Guild row (and onboardedAt exists to claim against).
    await upsertGuildMeta(guild);
    await cacheGuildInvites(guild);
    await sendGuildWelcome(guild).catch((error) =>
      ctx.logger.warn({ err: error, guildId: guild.id }, 'Welcome message failed'),
    );
    ctx.logger.info({ guildId: guild.id, name: guild.name }, 'Joined / synced guild');
  },
});
