import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Redis } from 'ioredis';
import { REDIS_CHANNELS, type LiveCommandMessage, type RefxAlertPayload } from '@helios/shared';
import { prisma } from '@helios/database';
import { fanOutRefxEvent } from './refx-fanout';
import { getRedis } from './redis';

const RUN = process.env.VITEST_SKIP_INTEGRATION !== '1';
const suite = RUN ? describe : describe.skip;

const MATCH_GUILD = `refx-fanout-match-${Date.now()}`;
const FILTERED_GUILD = `refx-fanout-filtered-${Date.now()}`;

suite('fanOutRefxEvent (integration)', () => {
  let sub: Redis;

  beforeAll(async () => {
    sub = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
    for (const id of [MATCH_GUILD, FILTERED_GUILD]) {
      await prisma.guild.upsert({ where: { id }, update: {}, create: { id } });
    }
    await prisma.guildModuleConfig.create({
      data: {
        guildId: MATCH_GUILD,
        module: 'REFX_ALERTS',
        enabled: true,
        config: { channelId: '999000111', regionFilter: ['ca-east'] },
      },
    });
    // Same event but a region filter that excludes ca-east => must be skipped.
    await prisma.guildModuleConfig.create({
      data: {
        guildId: FILTERED_GUILD,
        module: 'REFX_ALERTS',
        enabled: true,
        config: { channelId: '999000222', regionFilter: ['eu-west'] },
      },
    });
  });

  afterAll(async () => {
    await prisma.guild.deleteMany({ where: { id: { in: [MATCH_GUILD, FILTERED_GUILD] } } });
    await prisma.$disconnect();
    await sub.quit();
    await getRedis().quit();
  });

  it('publishes one REFX_ALERT only for the matching guild', async () => {
    const seen: LiveCommandMessage<RefxAlertPayload>[] = [];
    sub.on('message', (_channel, raw) => {
      const msg = JSON.parse(raw) as LiveCommandMessage<RefxAlertPayload>;
      if (msg.guildId === MATCH_GUILD || msg.guildId === FILTERED_GUILD) seen.push(msg);
    });
    await sub.subscribe(REDIS_CHANNELS.command);

    const count = await fanOutRefxEvent('incident.created', {
      timestamp: '2026-06-30T00:00:00Z',
      data: { id: 'i1', title: 'Outage', regionCode: 'ca-east' },
    });
    await new Promise((r) => setTimeout(r, 300));

    expect(count).toBe(1);
    expect(seen).toHaveLength(1);
    expect(seen[0]?.guildId).toBe(MATCH_GUILD);
    expect(seen[0]?.type).toBe('REFX_ALERT');
    expect(seen[0]?.payload?.channelId).toBe('999000111');
    expect(seen[0]?.payload?.event).toBe('incident.created');
  });
});
