import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { prisma } from '@solari/database';
import type { Command } from '../../framework/command';
import { RequireGuild, RequirePremium } from '../../lib/permissions';
import { brandedEmbed, errorEmbed } from '../../lib/embeds';
import { addWallet, formatMoney, getEconomyUser, trySpendBank, trySpendWallet } from '../../lib/economy';

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

    if (deposit) {
      if (!(await trySpendWallet(interaction.guildId, interaction.user.id, amount))) {
        await interaction.reply({
          embeds: [errorEmbed("You don't have that much in your wallet.")],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      await prisma.economyUser.update({
        where: { guildId_userId: { guildId: interaction.guildId, userId: interaction.user.id } },
        data: { bank: { increment: amount } },
      });
    } else {
      if (!(await trySpendBank(interaction.guildId, interaction.user.id, amount))) {
        await interaction.reply({
          embeds: [errorEmbed("You don't have that much in your bank.")],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      await addWallet(interaction.guildId, interaction.user.id, amount);
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
