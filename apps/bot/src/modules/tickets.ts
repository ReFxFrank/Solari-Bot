import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  type BaseMessageOptions,
  type Client,
  type Guild,
  type GuildTextBasedChannel,
  type OverwriteResolvable,
} from 'discord.js';
import { prisma } from '@helios/database';
import { QUEUE_NAMES } from '@helios/jobs';
import { parseModuleConfig, type TicketsConfig } from '@helios/shared';
import { brandedEmbed } from '../lib/embeds';
import { buildCustomId } from '../framework/customId';
import { ticketJobId, type JobService } from '../services/jobs';
import type { Logger } from '../logger';

export interface TicketDeps {
  client: Client;
  jobs: JobService;
  logger: Logger;
}

const HOUR_MS = 3_600_000;
const TOUCH_THROTTLE_MS = 60_000;

/**
 * Per-shard set of channel ids that are open tickets, so the message listener
 * can decide whether to bump activity with an O(1) lookup instead of a query
 * per message. Populated by `reconcileTickets` on boot and kept in sync by
 * open/close.
 */
const openTicketChannels = new Set<string>();
const lastTouchAt = new Map<string, number>();

export function isTicketChannel(channelId: string): boolean {
  return openTicketChannels.has(channelId);
}

export async function getTicketsConfig(guildId: string): Promise<TicketsConfig> {
  const row = await prisma.guildModuleConfig.findUnique({
    where: { guildId_module: { guildId, module: 'TICKETS' } },
    select: { config: true },
  });
  return parseModuleConfig('TICKETS', row?.config ?? {});
}

export function buildTicketPanelMessage(config: TicketsConfig): BaseMessageOptions {
  const embed = brandedEmbed({ title: config.panelTitle, description: config.panelDescription });
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId('ticket', 'open'))
      .setLabel(config.buttonLabel)
      .setEmoji('🎫')
      .setStyle(ButtonStyle.Primary),
  );
  return { embeds: [embed], components: [row] };
}

function resolveTextChannel(guild: Guild, channelId: string): GuildTextBasedChannel | null {
  const channel = guild.channels.cache.get(channelId);
  return channel && channel.isTextBased() && !channel.isDMBased() ? channel : null;
}

/**
 * Create a private ticket channel for `openerId`. Returns the new channel id or
 * a user-facing error reason. Does not check the module-enabled flag — the
 * caller does (the component path checks the config cache).
 */
export async function openTicket(
  guild: Guild,
  openerId: string,
  deps: TicketDeps,
): Promise<{ channelId: string } | { error: string }> {
  const config = await getTicketsConfig(guild.id);
  if (!config.categoryId) return { error: 'Tickets are not configured on this server yet.' };

  const category = guild.channels.cache.get(config.categoryId);
  if (!category || category.type !== ChannelType.GuildCategory) {
    return { error: 'The configured ticket category no longer exists.' };
  }

  const openCount = await prisma.ticket.count({
    where: { guildId: guild.id, openerId, status: 'OPEN' },
  });
  if (openCount >= config.maxOpenPerUser) {
    return {
      error: `You already have ${config.maxOpenPerUser} open ticket${config.maxOpenPerUser > 1 ? 's' : ''}.`,
    };
  }

  // Allocate a per-guild ticket number atomically (collision-safe).
  await prisma.guild.upsert({ where: { id: guild.id }, update: {}, create: { id: guild.id } });
  const { ticketCounter: number } = await prisma.guild.update({
    where: { id: guild.id },
    data: { ticketCounter: { increment: 1 } },
    select: { ticketCounter: true },
  });

  const overwrites: OverwriteResolvable[] = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: openerId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    },
    ...config.supportRoleIds.map((roleId) => ({
      id: roleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages,
      ],
    })),
  ];
  if (deps.client.user) {
    overwrites.push({
      id: deps.client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels,
      ],
    });
  }

  const channel = await guild.channels
    .create({
      name: `ticket-${String(number).padStart(4, '0')}`,
      type: ChannelType.GuildText,
      parent: config.categoryId,
      topic: `Ticket #${number} • opened by ${openerId}`,
      permissionOverwrites: overwrites,
    })
    .catch((err: unknown) => {
      deps.logger.warn({ err, guildId: guild.id }, 'Ticket channel create failed');
      return null;
    });
  if (!channel) return { error: "I couldn't create the ticket channel — check my permissions." };

  const ticket = await prisma.ticket.create({
    data: { guildId: guild.id, channelId: channel.id, number, openerId },
  });
  openTicketChannels.add(channel.id);

  const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId('ticket', 'close'))
      .setLabel('Close')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger),
  );
  const mentions = [`<@${openerId}>`, ...config.supportRoleIds.map((id) => `<@&${id}>`)].join(' ');
  await channel
    .send({
      content: mentions,
      embeds: [brandedEmbed({ title: `Ticket #${number}`, description: config.openMessage })],
      components: [closeRow],
      allowedMentions: { users: [openerId], roles: config.supportRoleIds },
    })
    .catch(() => undefined);

  if (config.autoCloseHours > 0) {
    await deps.jobs.schedule(
      QUEUE_NAMES.ticketAutoClose,
      'ticketAutoClose',
      { ticketId: ticket.id },
      { delayMs: config.autoCloseHours * HOUR_MS, jobId: ticketJobId(ticket.id) },
    );
  }

  return { channelId: channel.id };
}

async function buildTranscript(channel: GuildTextBasedChannel): Promise<string> {
  const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  if (!messages || messages.size === 0) return 'No messages.';
  return [...messages.values()]
    .reverse()
    .map((message) => {
      const when = new Date(message.createdTimestamp).toISOString();
      const body =
        message.cleanContent ||
        (message.attachments.size ? '[attachment]' : '') ||
        (message.embeds.length ? '[embed]' : '');
      return `[${when}] ${message.author.tag}: ${body}`;
    })
    .join('\n');
}

/**
 * Close a ticket: mark it closed, archive a transcript (if configured), cancel
 * its auto-close job, and delete the channel. Idempotent — a non-open ticket is
 * a no-op. Returns whether it acted.
 */
export async function closeTicket(
  channelId: string,
  closedById: string,
  deps: TicketDeps,
  reason = 'closed',
): Promise<boolean> {
  const ticket = await prisma.ticket.findUnique({ where: { channelId } });
  if (!ticket || ticket.status !== 'OPEN') return false;

  // Atomic claim: only the first closer (e.g. manual click vs. auto-close
  // firing at the same instant) proceeds to transcript + delete, so we never
  // archive twice.
  const claimed = await prisma.ticket.updateMany({
    where: { id: ticket.id, status: 'OPEN' },
    data: { status: 'CLOSED', closedById, closedAt: new Date() },
  });
  if (claimed.count === 0) return false;
  openTicketChannels.delete(channelId);
  lastTouchAt.delete(channelId);
  await deps.jobs.cancel(QUEUE_NAMES.ticketAutoClose, ticketJobId(ticket.id));

  const guild = deps.client.guilds.cache.get(ticket.guildId);
  const channel = guild ? resolveTextChannel(guild, channelId) : null;
  const config = await getTicketsConfig(ticket.guildId);

  if (channel && config.transcriptChannelId) {
    const transcript = await buildTranscript(channel);
    const transcriptChannel = guild ? resolveTextChannel(guild, config.transcriptChannelId) : null;
    if (transcriptChannel) {
      const file = new AttachmentBuilder(Buffer.from(transcript, 'utf8'), {
        name: `transcript-ticket-${ticket.number}.txt`,
      });
      await transcriptChannel
        .send({
          embeds: [
            brandedEmbed({
              title: `Ticket #${ticket.number} closed`,
              description: `Opened by <@${ticket.openerId}> • closed by <@${closedById}> • ${reason}`,
            }),
          ],
          files: [file],
          allowedMentions: { parse: [] },
        })
        .catch(() => undefined);
    }
  }

  if (channel) {
    await channel.delete(`Ticket #${ticket.number} ${reason}`).catch(() => undefined);
  }
  return true;
}

/** Bump a ticket's activity clock and push back its auto-close (throttled). */
export async function touchTicket(channelId: string, deps: TicketDeps): Promise<void> {
  const now = Date.now();
  if (now - (lastTouchAt.get(channelId) ?? 0) < TOUCH_THROTTLE_MS) return;
  lastTouchAt.set(channelId, now);

  const ticket = await prisma.ticket.findUnique({
    where: { channelId },
    select: { id: true, guildId: true, status: true },
  });
  if (!ticket || ticket.status !== 'OPEN') {
    openTicketChannels.delete(channelId);
    return;
  }
  await prisma.ticket.update({ where: { id: ticket.id }, data: { lastActivityAt: new Date() } });

  const config = await getTicketsConfig(ticket.guildId);
  if (config.autoCloseHours > 0) {
    await deps.jobs.schedule(
      QUEUE_NAMES.ticketAutoClose,
      'ticketAutoClose',
      { ticketId: ticket.id },
      { delayMs: config.autoCloseHours * HOUR_MS, jobId: ticketJobId(ticket.id) },
    );
  }
}

/**
 * A channel was deleted out-of-band (manually, not via close). Mark its ticket
 * closed and drop its timers so reconcile/auto-close don't chase a dead channel.
 */
export async function onTicketChannelDeleted(
  channelId: string,
  deps: Pick<TicketDeps, 'jobs'>,
): Promise<void> {
  openTicketChannels.delete(channelId);
  lastTouchAt.delete(channelId);
  const ticket = await prisma.ticket.findUnique({
    where: { channelId },
    select: { id: true, status: true },
  });
  if (!ticket || ticket.status !== 'OPEN') return;
  await prisma.ticket.updateMany({
    where: { id: ticket.id, status: 'OPEN' },
    data: { status: 'CLOSED', closedAt: new Date() },
  });
  await deps.jobs.cancel(QUEUE_NAMES.ticketAutoClose, ticketJobId(ticket.id));
}

/** Load open tickets for this shard's guilds into the activity set + re-arm jobs. */
export async function reconcileTickets(
  client: Client,
  jobs: JobService,
  logger: Logger,
): Promise<void> {
  const guildIds = [...client.guilds.cache.keys()];
  if (guildIds.length === 0) return;
  const tickets = await prisma.ticket.findMany({
    where: { status: 'OPEN', guildId: { in: guildIds } },
    select: { id: true, guildId: true, channelId: true, lastActivityAt: true },
  });
  openTicketChannels.clear();
  for (const ticket of tickets) {
    openTicketChannels.add(ticket.channelId);
    const config = await getTicketsConfig(ticket.guildId);
    if (config.autoCloseHours > 0) {
      const fireAt = ticket.lastActivityAt.getTime() + config.autoCloseHours * HOUR_MS;
      await jobs.schedule(
        QUEUE_NAMES.ticketAutoClose,
        'ticketAutoClose',
        { ticketId: ticket.id },
        { delayMs: fireAt - Date.now(), jobId: ticketJobId(ticket.id) },
      );
    }
  }
  logger.info({ count: tickets.length }, 'Reconciled tickets');
}
