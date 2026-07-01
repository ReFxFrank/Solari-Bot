import { createHmac } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@solari/database';
import { getRedis } from '../../../../lib/redis';
import { POST } from './route';

const RUN = process.env.VITEST_SKIP_INTEGRATION !== '1';
const suite = RUN ? describe : describe.skip;

const SECRET = 'route-test-secret-32-bytes-minimum-xx';
const GUILD = `refx-route-${Date.now()}`;
const URL = 'http://localhost/api/integrations/refx';

function sign(body: string): string {
  return 'sha256=' + createHmac('sha256', SECRET).update(body, 'utf8').digest('hex');
}

function req(body: string, headers: Record<string, string>): Request {
  return new Request(URL, { method: 'POST', body, headers });
}

const validBody = JSON.stringify({
  event: 'incident.created',
  timestamp: '2026-06-30T00:00:00Z',
  data: { id: 'i1', title: 'Outage', regionCode: 'ca-east' },
});

suite('POST /api/integrations/refx (integration)', () => {
  beforeAll(async () => {
    await prisma.guild.upsert({ where: { id: GUILD }, update: {}, create: { id: GUILD } });
    await prisma.guildModuleConfig.create({
      data: {
        guildId: GUILD,
        module: 'REFX_ALERTS',
        enabled: true,
        config: { channelId: '12345' },
      },
    });
  });

  afterAll(async () => {
    await prisma.guild.deleteMany({ where: { id: GUILD } });
    delete process.env.REFX_WEBHOOK_SECRET;
    await prisma.$disconnect();
    await getRedis().quit();
  });

  it('fails closed with 503 when the secret is unset', async () => {
    delete process.env.REFX_WEBHOOK_SECRET;
    const res = await POST(
      req(validBody, {
        'x-refx-signature': sign(validBody),
        'x-refx-event': 'incident.created',
        'x-refx-delivery': `d-${Date.now()}-a`,
      }),
    );
    expect(res.status).toBe(503);
  });

  it('rejects a bad signature with 401', async () => {
    process.env.REFX_WEBHOOK_SECRET = SECRET;
    const res = await POST(
      req(validBody, {
        'x-refx-signature': 'sha256=' + 'a'.repeat(64),
        'x-refx-event': 'incident.created',
        'x-refx-delivery': `d-${Date.now()}-b`,
      }),
    );
    expect(res.status).toBe(401);
  });

  it('rejects missing headers with 400 and unknown events with 400', async () => {
    process.env.REFX_WEBHOOK_SECRET = SECRET;
    const noHeaders = await POST(req(validBody, { 'x-refx-signature': sign(validBody) }));
    expect(noHeaders.status).toBe(400);

    const unknown = JSON.stringify({ event: 'nope', timestamp: 't', data: {} });
    const badEvent = await POST(
      req(unknown, {
        'x-refx-signature': sign(unknown),
        'x-refx-event': 'nope',
        'x-refx-delivery': `d-${Date.now()}-c`,
      }),
    );
    expect(badEvent.status).toBe(400);
  });

  it('accepts a signed delivery, fans out, and dedups the retry', async () => {
    process.env.REFX_WEBHOOK_SECRET = SECRET;
    // Unique body per run so the signature-keyed dedupe doesn't collide with a
    // prior run's still-live Redis key.
    const body = JSON.stringify({
      event: 'incident.created',
      timestamp: '2026-06-30T00:00:00Z',
      data: { id: `i-${Date.now()}`, title: 'Outage', regionCode: 'ca-east' },
    });
    const headers = {
      'x-refx-signature': sign(body),
      'x-refx-event': 'incident.created',
      'x-refx-delivery': `d-${Date.now()}-dedupe`,
    };
    const first = await POST(req(body, headers));
    expect(first.status).toBe(200);
    const firstJson = (await first.json()) as { fannedOut: number };
    expect(firstJson.fannedOut).toBeGreaterThanOrEqual(1);

    const retry = await POST(req(body, headers));
    expect(retry.status).toBe(200);
    const retryJson = (await retry.json()) as { deduped?: boolean };
    expect(retryJson.deduped).toBe(true);
  });

  it('returns 422 on a valid signature but non-object data and releases the dedupe key', async () => {
    process.env.REFX_WEBHOOK_SECRET = SECRET;
    // data must be an object; a non-object fails schema even though all inner
    // fields are now optional (fail-open parsing).
    const badBody = JSON.stringify({
      event: 'incident.created',
      timestamp: 't',
      data: `not-an-object-${Date.now()}`,
    });
    const sig = sign(badBody);
    const res = await POST(
      req(badBody, {
        'x-refx-signature': sig,
        'x-refx-event': 'incident.created',
        'x-refx-delivery': `d-${Date.now()}-bad`,
      }),
    );
    expect(res.status).toBe(422);
    // The dedupe key is the signature hex; it must be released so a corrected
    // retry of the same delivery isn't swallowed.
    expect(await getRedis().get(`refx:webhook:${sig.slice('sha256='.length)}`)).toBeNull();
  });
});
