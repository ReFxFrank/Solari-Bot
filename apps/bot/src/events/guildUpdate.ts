import { Events } from 'discord.js';
import { defineEvent } from '../framework/event';
import { upsertGuildMeta } from '../lib/guildSync';

export default defineEvent({
  name: Events.GuildUpdate,
  async execute(_ctx, _oldGuild, newGuild) {
    await upsertGuildMeta(newGuild);
  },
});
