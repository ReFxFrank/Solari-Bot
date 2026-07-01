import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../framework/command';
import { RequireGuild, RequirePremium } from '../../lib/permissions';
import { brandedEmbed } from '../../lib/embeds';
import { formatMoney, getEconomyUser } from '../../lib/economy';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check a wallet + bank balance.')
    .addUserOption((o) => o.setName('user').setDescription('Whose balance (defaults to you)')),
  module: 'ECONOMY',
  preconditions: [RequireGuild, RequirePremium('ECONOMY')],
  async execute(interaction, ctx) {
    if (!interaction.inCachedGuild()) return;
    const target = interaction.options.getUser('user') ?? interaction.user;
    const config = await ctx.config.getConfig(interaction.guildId, 'ECONOMY');
    const eco = await getEconomyUser(interaction.guildId, target.id, config.startingBalance);

    await interaction.reply({
      embeds: [
        brandedEmbed({ kind: 'default', title: `💰 ${target.username}'s balance` }).addFields(
          { name: 'Wallet', value: formatMoney(eco.wallet, config), inline: true },
          { name: 'Bank', value: formatMoney(eco.bank, config), inline: true },
          { name: 'Total', value: formatMoney(eco.wallet + eco.bank, config), inline: true },
        ),
      ],
    });
  },
};

export default command;
