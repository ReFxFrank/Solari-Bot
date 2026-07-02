import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import { BRAND } from '@solari/shared';
import type { Command } from '../../framework/command';
import { Cooldown } from '../../lib/permissions';
import { brandedEmbed } from '../../lib/embeds';

const SITE = 'https://solari.gg';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('How to use the bot — dashboard, wiki, and popular commands.'),
  preconditions: [Cooldown(5)],
  async execute(interaction) {
    const links = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Dashboard').setURL(`${SITE}/servers`),
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Wiki').setURL('https://wiki.solari.gg'),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel('All commands')
        .setURL(`${SITE}/commands`),
    );

    await interaction.reply({
      embeds: [
        brandedEmbed({
          kind: 'info',
          title: `👋 ${BRAND.name} Help`,
          description:
            `${BRAND.name} is configured from the **web dashboard** — every module, ` +
            'every setting, live in about a second. The wiki has a setup guide for each module.',
        }).addFields(
          {
            name: 'Popular commands',
            value: [
              '`/rank` · `/leaderboard` — levels and XP',
              '`/daily` · `/balance` · `/blackjack` · `/roulette` — economy & casino',
              '`/warn` · `/warnings` · `/ban` · `/timeout` — moderation',
              '`/giveaway` · `/poll` · `/remind` — community tools',
              '`/userinfo` · `/serverinfo` · `/avatar` — quick lookups',
            ].join('\n'),
          },
          {
            name: 'For admins',
            value: `Open the dashboard, pick this server, and toggle modules on the Overview page. Turning a module on is all it takes — Tickets even sets itself up.`,
          },
        ),
      ],
      components: [links],
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
