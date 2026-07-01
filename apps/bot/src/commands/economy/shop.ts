import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../framework/command';
import { RequireGuild, RequirePremium } from '../../lib/permissions';
import { brandedEmbed } from '../../lib/embeds';
import { formatMoney } from '../../lib/economy';

const command: Command = {
  data: new SlashCommandBuilder().setName('shop').setDescription('Browse the server shop.'),
  module: 'ECONOMY',
  preconditions: [RequireGuild, RequirePremium('ECONOMY')],
  async execute(interaction, ctx) {
    if (!interaction.inCachedGuild()) return;
    const config = await ctx.config.getConfig(interaction.guildId, 'ECONOMY');

    if (config.shopItems.length === 0) {
      await interaction.reply({
        embeds: [
          brandedEmbed({
            kind: 'info',
            title: '🛒 Server Shop',
            description: 'The shop is empty. An admin can add items from the dashboard.',
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const lines = config.shopItems.map((item) => {
      const role = item.roleId ? interaction.guild.roles.cache.get(item.roleId) : null;
      const roleNote = role ? ` · grants **@${role.name}**` : item.roleId ? ' · grants a role' : '';
      const desc = item.description ? `\n   _${item.description}_` : '';
      return `**${item.label}** — ${formatMoney(item.price, config)}${roleNote}${desc}`;
    });

    await interaction.reply({
      embeds: [
        brandedEmbed({
          kind: 'default',
          title: '🛒 Server Shop',
          description: `${lines.join('\n\n')}\n\nBuy an item with \`/buy\`.`,
        }),
      ],
    });
  },
};

export default command;
