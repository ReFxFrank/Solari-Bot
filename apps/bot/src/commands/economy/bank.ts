import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../framework/command';
import { RequireGuild, RequirePremium } from '../../lib/permissions';
import { brandedEmbed, errorEmbed } from '../../lib/embeds';
import { formatMoney, getEconomyUser, tryMoveMoney } from '../../lib/economy';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('bank')
    .setDescription('Move money between your wallet and bank.')
    .addSubcommand((s) =>
      s
        .setName('deposit')
        .setDescription('Wallet → bank.')
        .addIntegerOption((o) =>
          o.setName('amount').setDescription('How much').setRequired(true).setMinValue(1),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName('withdraw')
        .setDescription('Bank → wallet.')
        .addIntegerOption((o) =>
          o.setName('amount').setDescription('How much').setRequired(true).setMinValue(1),
        ),
    ),
  module: 'ECONOMY',
  preconditions: [RequireGuild, RequirePremium('ECONOMY')],
  async execute(interaction, ctx) {
    if (!interaction.inCachedGuild()) return;
    const amount = interaction.options.getInteger('amount', true);
    const deposit = interaction.options.getSubcommand() === 'deposit';
    const config = await ctx.config.getConfig(interaction.guildId, 'ECONOMY');
    await getEconomyUser(interaction.guildId, interaction.user.id, config.startingBalance);

    if (!(await tryMoveMoney(interaction.guildId, interaction.user.id, amount, deposit))) {
      await interaction.reply({
        embeds: [
          errorEmbed(
            deposit
              ? "You don't have that much in your wallet."
              : "You don't have that much in your bank.",
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.reply({
      embeds: [
        brandedEmbed({
          kind: 'success',
          description: deposit
            ? `🏦 Deposited ${formatMoney(amount, config)} into your bank.`
            : `🏦 Withdrew ${formatMoney(amount, config)} to your wallet.`,
        }),
      ],
    });
  },
};

export default command;
