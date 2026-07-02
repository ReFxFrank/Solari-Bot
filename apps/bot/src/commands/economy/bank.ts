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
        .addStringOption((o) =>
          o.setName('amount').setDescription('A number, "all", or "half"').setRequired(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName('withdraw')
        .setDescription('Bank → wallet.')
        .addStringOption((o) =>
          o.setName('amount').setDescription('A number, "all", or "half"').setRequired(true),
        ),
    ),
  module: 'ECONOMY',
  preconditions: [RequireGuild, RequirePremium('ECONOMY')],
  async execute(interaction, ctx) {
    if (!interaction.inCachedGuild()) return;
    const deposit = interaction.options.getSubcommand() === 'deposit';
    const config = await ctx.config.getConfig(interaction.guildId, 'ECONOMY');
    const eco = await getEconomyUser(interaction.guildId, interaction.user.id, config.startingBalance);

    // "all" / "half" resolve against the source side; otherwise a plain
    // positive integer (commas tolerated: "1,000"). If the balance changes
    // between this read and the move, tryMoveMoney fails safely below.
    const raw = interaction.options.getString('amount', true).trim().toLowerCase();
    const available = deposit ? eco.wallet : eco.bank;
    let amount: number;
    if (raw === 'all' || raw === 'max') amount = available;
    else if (raw === 'half') amount = Math.floor(available / 2);
    else {
      amount = /^[\d,]+$/.test(raw) ? Number(raw.replaceAll(',', '')) : NaN;
      if (!Number.isSafeInteger(amount) || amount <= 0) {
        await interaction.reply({
          embeds: [errorEmbed('Enter a positive number, `all`, or `half`.')],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }
    if (amount <= 0) {
      await interaction.reply({
        embeds: [errorEmbed(deposit ? 'Your wallet is empty.' : 'Your bank is empty.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

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
