import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../framework/command';
import { RequireGuild, RequirePremium } from '../../lib/permissions';
import { brandedEmbed, errorEmbed } from '../../lib/embeds';
import { addWallet, formatMoney, getEconomyUser, trySpendWallet } from '../../lib/economy';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Buy an item from the server shop.')
    .addStringOption((o) =>
      o
        .setName('item')
        .setDescription('The item to buy')
        .setRequired(true)
        .setAutocomplete(true),
    ),
  module: 'ECONOMY',
  preconditions: [RequireGuild, RequirePremium('ECONOMY')],
  async autocomplete(interaction, ctx) {
    if (!interaction.guildId) {
      await interaction.respond([]);
      return;
    }
    const config = await ctx.config.getConfig(interaction.guildId, 'ECONOMY');
    const focused = interaction.options.getFocused().toLowerCase();
    const choices = config.shopItems
      .filter((item) => item.label.toLowerCase().includes(focused))
      .slice(0, 25)
      .map((item) => ({ name: `${item.label} — ${item.price}`.slice(0, 100), value: item.id }));
    await interaction.respond(choices);
  },
  async execute(interaction, ctx) {
    if (!interaction.inCachedGuild()) return;
    const config = await ctx.config.getConfig(interaction.guildId, 'ECONOMY');
    const input = interaction.options.getString('item', true);

    // Resolve by id (from autocomplete) or by a typed label as a fallback.
    const item =
      config.shopItems.find((i) => i.id === input) ??
      config.shopItems.find((i) => i.label.toLowerCase() === input.toLowerCase());
    if (!item) {
      await interaction.reply({
        embeds: [errorEmbed('No such item. Use `/shop` to see what’s available.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Ensure the wallet row exists so the guarded debit can match it.
    await getEconomyUser(interaction.guildId, interaction.user.id, config.startingBalance);

    if (item.roleId && interaction.member.roles.cache.has(item.roleId)) {
      await interaction.reply({
        embeds: [brandedEmbed({ kind: 'warning', description: 'You already own that item.' })],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!(await trySpendWallet(interaction.guildId, interaction.user.id, item.price))) {
      await interaction.reply({
        embeds: [
          errorEmbed(`You need ${formatMoney(item.price, config)} in your wallet to buy that.`),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Deliver the role, refunding if the grant fails (role order / permissions).
    if (item.roleId) {
      try {
        await interaction.member.roles.add(item.roleId, `Shop purchase: ${item.label}`);
      } catch (err) {
        ctx.logger.warn({ err, roleId: item.roleId }, 'Shop role grant failed; refunding');
        await addWallet(interaction.guildId, interaction.user.id, item.price);
        await interaction.reply({
          embeds: [
            errorEmbed(
              'I couldn’t assign that role — check my permissions and that my role is above it. You were refunded.',
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    await interaction.reply({
      embeds: [
        brandedEmbed({
          kind: 'success',
          description: `✅ You bought **${item.label}** for ${formatMoney(item.price, config)}.`,
        }),
      ],
    });
  },
};

export default command;
