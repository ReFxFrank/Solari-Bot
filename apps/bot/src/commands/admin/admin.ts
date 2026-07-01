import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { prisma } from '@solari/database';
import type { Command } from '../../framework/command';
import { RequireBotOwner } from '../../lib/permissions';
import { brandedEmbed, errorEmbed } from '../../lib/embeds';
import { invalidateBlacklist } from '../../services/blacklist';

type BlacklistKind = 'GUILD' | 'USER';
type Tier = 'FREE' | 'PREMIUM';

function uptime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  return [d ? `${d}d` : '', h ? `${h}h` : '', `${m}m`].filter(Boolean).join(' ');
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Bot-owner administration.')
    .addSubcommand((s) => s.setName('stats').setDescription('Global bot statistics.'))
    .addSubcommand((s) =>
      s
        .setName('premium')
        .setDescription("Manually set a guild's premium tier (comp / revoke).")
        .addStringOption((o) =>
          o.setName('guild_id').setDescription('Target guild id').setRequired(true),
        )
        .addStringOption((o) =>
          o
            .setName('tier')
            .setDescription('Tier to set')
            .setRequired(true)
            .addChoices({ name: 'Premium', value: 'PREMIUM' }, { name: 'Free', value: 'FREE' }),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName('leaveguild')
        .setDescription('Make the bot leave a guild.')
        .addStringOption((o) =>
          o.setName('guild_id').setDescription('Target guild id').setRequired(true),
        ),
    )
    .addSubcommandGroup((g) =>
      g
        .setName('blacklist')
        .setDescription('Bar a guild or user from using the bot.')
        .addSubcommand((s) =>
          s
            .setName('add')
            .setDescription('Add a guild or user to the blacklist.')
            .addStringOption((o) =>
              o
                .setName('type')
                .setDescription('What to blacklist')
                .setRequired(true)
                .addChoices({ name: 'Guild', value: 'GUILD' }, { name: 'User', value: 'USER' }),
            )
            .addStringOption((o) =>
              o.setName('target_id').setDescription('Guild or user id').setRequired(true),
            )
            .addStringOption((o) => o.setName('reason').setDescription('Why (optional)')),
        )
        .addSubcommand((s) =>
          s
            .setName('remove')
            .setDescription('Remove a guild or user from the blacklist.')
            .addStringOption((o) =>
              o
                .setName('type')
                .setDescription('What to unblacklist')
                .setRequired(true)
                .addChoices({ name: 'Guild', value: 'GUILD' }, { name: 'User', value: 'USER' }),
            )
            .addStringOption((o) =>
              o.setName('target_id').setDescription('Guild or user id').setRequired(true),
            ),
        )
        .addSubcommand((s) => s.setName('list').setDescription('List blacklisted guilds/users.')),
    ),
  preconditions: [RequireBotOwner],
  async execute(interaction, ctx) {
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();
    const reply = (embed: ReturnType<typeof brandedEmbed>): Promise<unknown> =>
      interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

    if (group === 'blacklist') {
      if (sub === 'list') {
        const rows = await prisma.blacklist.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
        const lines = rows.map(
          (r: { type: string; targetId: string; reason: string | null }) =>
            `\`${r.type}\` \`${r.targetId}\`${r.reason ? ` — ${r.reason}` : ''}`,
        );
        await reply(
          brandedEmbed({
            kind: 'default',
            title: '🚫 Blacklist',
            description: lines.length ? lines.join('\n') : 'Nothing is blacklisted.',
          }),
        );
        return;
      }

      const type = interaction.options.getString('type', true) as BlacklistKind;
      const targetId = interaction.options.getString('target_id', true).trim();

      if (sub === 'add') {
        const reason = interaction.options.getString('reason')?.trim() || null;
        await prisma.blacklist.upsert({
          where: { type_targetId: { type, targetId } },
          update: { reason },
          create: { type, targetId, reason },
        });
        invalidateBlacklist();
        await reply(
          brandedEmbed({ kind: 'success', description: `🚫 Blacklisted **${type}** \`${targetId}\`.` }),
        );
        return;
      }

      // remove
      await prisma.blacklist.deleteMany({ where: { type, targetId } });
      invalidateBlacklist();
      await reply(
        brandedEmbed({ kind: 'success', description: `✅ Removed **${type}** \`${targetId}\` from the blacklist.` }),
      );
      return;
    }

    if (sub === 'stats') {
      const [premiumCount, blacklistCount] = await Promise.all([
        prisma.guild.count({ where: { premiumTier: 'PREMIUM' } }),
        prisma.blacklist.count(),
      ]);
      await reply(
        brandedEmbed({
          kind: 'default',
          title: '📊 Solari — global stats',
          description:
            `**Servers:** ${ctx.client.guilds.cache.size.toLocaleString()}\n` +
            `**Premium servers:** ${premiumCount.toLocaleString()}\n` +
            `**Blacklisted:** ${blacklistCount.toLocaleString()}\n` +
            `**Uptime:** ${uptime(ctx.client.uptime ?? 0)}`,
        }),
      );
      return;
    }

    if (sub === 'premium') {
      const guildId = interaction.options.getString('guild_id', true).trim();
      const tier = interaction.options.getString('tier', true) as Tier;
      await prisma.guild.upsert({
        where: { id: guildId },
        update: { premiumTier: tier },
        create: { id: guildId, premiumTier: tier },
      });
      await reply(
        brandedEmbed({
          kind: 'success',
          description:
            `✅ Set guild \`${guildId}\` to **${tier}**.` +
            (tier === 'PREMIUM' ? ' (Manual override — a Stripe event may change it later.)' : ''),
        }),
      );
      return;
    }

    // leaveguild
    const guildId = interaction.options.getString('guild_id', true).trim();
    const guild = ctx.client.guilds.cache.get(guildId);
    if (!guild) {
      await interaction.reply({
        embeds: [errorEmbed("I'm not in a guild with that id.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const name = guild.name;
    await guild.leave();
    await reply(brandedEmbed({ kind: 'success', description: `👋 Left **${name}** (\`${guildId}\`).` }));
  },
};

export default command;
