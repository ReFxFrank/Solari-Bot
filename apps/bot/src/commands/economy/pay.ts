import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../framework/command';
import { RequireGuild, RequirePremium } from '../../lib/permissions';
import { brandedEmbed, errorEmbed } from '../../lib/embeds';
import { addWallet, formatMoney, getEconomyUser, trySpendWallet } from '../../lib/economy';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Give some of your wallet to another member.')
    .addUserOption((o) => o.setName('user').setDescription('Who to pay').setRequired(true))
    .addIntegerOption((o) =>
      o.setName('amount').setDescription('How much').setRequired(true).setMinValue(1),
    ),
  module: 'ECONOMY',
  preconditions: [RequireGuild, RequirePremium('ECONOMY')],
  async execute(interaction, ctx) {
    if (!interaction.inCachedGuild()) return;
    const target = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);

    if (target.id === interaction.user.id || target.bot) {
      await interaction.reply({
        embeds: [errorEmbed('Pick a different member to pay.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const config = await ctx.config.getConfig(interaction.guildId, 'ECONOMY');
    // Ensure both rows exist, then debit the sender race-safely before crediting.
    await getEconomyUser(interaction.guildId, interaction.user.id, config.startingBalance);
    await getEconomyUser(interaction.guildId, target.id, config.startingBalance);

    if (!(await trySpendWallet(interaction.guildId, interaction.user.id, amount))) {
      await interaction.reply({
        embeds: [errorEmbed("You don't have that much in your wallet.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await addWallet(interaction.guildId, target.id, amount);

    await interaction.reply({
      embeds: [
        brandedEmbed({
          kind: 'success',
          description: `💸 You paid <@${target.id}> ${formatMoney(amount, config)}.`,
        }),
      ],
    });
  },
};

export default command;
