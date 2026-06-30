import type { Message } from 'discord.js';
import { prisma } from '@helios/database';
import { levelFromXp, type LevelingConfig } from '@helios/shared';
import { applyPlaceholders, type PlaceholderMember } from '../lib/placeholders';
import type { BotContext } from '../framework/context';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export interface AwardXpParams {
  guildId: string;
  userId: string;
  min: number;
  max: number;
  cooldownSeconds: number;
  /** Override the clock (tests). */
  now?: number;
}

export interface AwardXpResult {
  awarded: boolean;
  xp: number;
  level: number;
  previousLevel: number;
  leveledUp: boolean;
}

/**
 * Award text XP to a user, respecting the per-user cooldown. Pure data layer
 * (no Discord) so it's unit-testable against the DB.
 */
export async function awardXp(params: AwardXpParams): Promise<AwardXpResult> {
  const now = params.now ?? Date.now();
  const where = { guildId_userId: { guildId: params.guildId, userId: params.userId } };
  const existing = await prisma.userLevel.findUnique({ where });

  if (existing?.lastXpAt && now - existing.lastXpAt.getTime() < params.cooldownSeconds * 1000) {
    return {
      awarded: false,
      xp: existing.xp,
      level: existing.level,
      previousLevel: existing.level,
      leveledUp: false,
    };
  }

  const xp = (existing?.xp ?? 0) + randomInt(params.min, params.max);
  const level = levelFromXp(xp);
  const previousLevel = existing?.level ?? 0;

  await prisma.userLevel.upsert({
    where,
    update: { xp, level, messages: { increment: 1 }, lastXpAt: new Date(now) },
    create: {
      guildId: params.guildId,
      userId: params.userId,
      xp,
      level,
      messages: 1,
      lastXpAt: new Date(now),
    },
  });

  return { awarded: true, xp, level, previousLevel, leveledUp: level > previousLevel };
}

/** messageCreate handler: award XP and announce/reward level-ups. */
export async function handleMessageXp(message: Message, ctx: BotContext): Promise<void> {
  if (!message.inGuild() || message.author.bot || message.system) return;
  if (!(await ctx.config.isEnabled(message.guildId, 'LEVELING'))) return;

  const config = await ctx.config.getConfig(message.guildId, 'LEVELING');
  if (config.noXpChannelIds.includes(message.channelId)) return;
  if (message.member && config.noXpRoleIds.some((id) => message.member?.roles.cache.has(id)))
    return;

  const result = await awardXp({
    guildId: message.guildId,
    userId: message.author.id,
    min: config.textXpMin,
    max: config.textXpMax,
    cooldownSeconds: config.xpCooldownSeconds,
  });
  if (!result.leveledUp) return;

  await announceLevelUp(message, config, result.level, ctx);
  await applyRoleRewards(message, config, result.level);
}

async function announceLevelUp(
  message: Message<true>,
  config: LevelingConfig,
  level: number,
  ctx: BotContext,
): Promise<void> {
  if (config.announce === 'OFF') return;
  const member: PlaceholderMember = {
    user: {
      id: message.author.id,
      tag: message.author.tag,
      username: message.author.username,
      createdTimestamp: message.author.createdTimestamp,
    },
    guild: { name: message.guild.name, memberCount: message.guild.memberCount },
  };
  const text = applyPlaceholders(config.levelUpMessage, member, { '{level}': String(level) });

  try {
    if (config.announce === 'DM') {
      await message.author.send(text);
      return;
    }
    if (config.announce === 'CHANNEL' && config.announceChannelId) {
      const channel = message.guild.channels.cache.get(config.announceChannelId);
      if (channel?.isTextBased() && !channel.isDMBased()) await channel.send(text);
      return;
    }
    if (message.channel.isSendable()) await message.channel.send(text);
  } catch (err) {
    ctx.logger.warn({ err, guildId: message.guildId }, 'Level-up announcement failed');
  }
}

async function applyRoleRewards(
  message: Message<true>,
  config: LevelingConfig,
  level: number,
): Promise<void> {
  const member = message.member;
  if (!member || config.rewards.length === 0) return;
  const earned = config.rewards.filter((reward) => reward.level <= level);
  if (earned.length === 0) return;
  const exists = (id: string): boolean => member.guild.roles.cache.has(id);

  if (config.roleRewardStack) {
    const toAdd = earned.map((reward) => reward.roleId).filter(exists);
    if (toAdd.length) await member.roles.add(toAdd, 'Level reward').catch(() => undefined);
    return;
  }

  const highest = earned.reduce((a, b) => (b.level > a.level ? b : a));
  const toRemove = config.rewards
    .filter((reward) => reward.roleId !== highest.roleId)
    .map((reward) => reward.roleId)
    .filter((id) => member.roles.cache.has(id));
  if (toRemove.length)
    await member.roles.remove(toRemove, 'Level reward (replace)').catch(() => undefined);
  if (exists(highest.roleId))
    await member.roles.add(highest.roleId, 'Level reward').catch(() => undefined);
}
