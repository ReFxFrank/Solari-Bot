import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  type Guild,
  type GuildTextBasedChannel,
  type TextChannel,
} from 'discord.js';
import { prisma } from '@solari/database';
import { BRAND } from '@solari/shared';
import { brandedEmbed } from '../lib/embeds';

const SITE = 'https://solari.gg';

/**
 * Pick a channel to greet a freshly-joined guild in: the server's system
 * channel when we can post there, otherwise the first text channel where we
 * have View + Send. Returns null if there's nowhere we're allowed to talk.
 */
function firstSendableChannel(guild: Guild): GuildTextBasedChannel | null {
  const me = guild.members.me;
  if (!me) return null;

  const canSend = (channel: GuildTextBasedChannel): boolean => {
    const perms = channel.permissionsFor(me);
    return Boolean(
      perms?.has(PermissionFlagsBits.ViewChannel) && perms.has(PermissionFlagsBits.SendMessages),
    );
  };

  const system = guild.systemChannel;
  if (system && canSend(system)) return system;

  const text = guild.channels.cache
    .filter(
      (channel): channel is TextChannel =>
        channel.type === ChannelType.GuildText && canSend(channel),
    )
    .sort((a, b) => a.rawPosition - b.rawPosition)
    .first();

  return text ?? null;
}

/**
 * Post a one-time branded welcome when Solari joins a guild: what it is, and
 * buttons straight to this server's dashboard and the wiki. Idempotent via
 * `Guild.onboardedAt` — a re-invite (or a duplicate gateway event) never
 * double-posts. Best-effort: missing permissions or a race just no-op.
 */
export async function sendGuildWelcome(guild: Guild): Promise<void> {
  // Claim the onboarding slot atomically: only the update that actually flips a
  // still-null onboardedAt proceeds to post. Concurrent guildCreate handling or
  // a quick leave/rejoin can't produce two welcomes.
  const claimed = await prisma.guild.updateMany({
    where: { id: guild.id, onboardedAt: null },
    data: { onboardedAt: new Date() },
  });
  if (claimed.count === 0) return;

  const channel = firstSendableChannel(guild);
  if (!channel) return;

  const embed = brandedEmbed({
    title: `👋 Thanks for adding ${BRAND.name}!`,
    description:
      `${BRAND.name} is an all-in-one bot — moderation, auto-mod, welcomes, leveling, ` +
      'economy, tickets, giveaways and much more, all managed from one dashboard.\n\n' +
      '**Get started:** open the dashboard below, pick this server, and choose a Quick ' +
      'Setup preset — we’ll switch on a sensible bundle of modules with smart defaults ' +
      'in one click. You can fine-tune everything from there.',
  }).addFields({
    name: 'Need a hand?',
    value: `The wiki has a short setup guide for every module. Run \`/help\` any time.`,
  });

  const links = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel('Open dashboard')
      .setURL(`${SITE}/servers/${guild.id}`),
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Wiki').setURL(`${SITE}/docs`),
  );

  await channel.send({ embeds: [embed], components: [links] }).catch(() => undefined);
}
