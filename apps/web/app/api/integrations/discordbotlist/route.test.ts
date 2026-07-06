import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@solari/database';
import { POST } from './route';

const RUN = process.env.VITEST_SKIP_INTEGRATION !== '1';
const suite = RUN ? describe : describe.skip;

const AUTH = 'dbl-route-test-secret';
const USER = `dbl-test-${Date.now()}`;
const URL = 'http://localhost/api/integrations/discordbotlist';

function req(body: unknown, auth?: string): Request {
  return new Request(URL, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      ...(auth ? { authorization: auth } : {}),
    },
  });
}

suite('POST /api/integrations/discordbotlist (integration)', () => {
  beforeAll(() => {
    process.env.DBL_WEBHOOK_AUTH = AUTH;
  });

  afterAll(async () => {
    delete process.env.DBL_WEBHOOK_AUTH;
    await prisma.topggVote.deleteMany({ where: { userId: USER } });
    await prisma.$disconnect();
  });

  it('fails closed (503) when DBL_WEBHOOK_AUTH is unset', async () => {
    delete process.env.DBL_WEBHOOK_AUTH;
    const response = await POST(req({ id: USER }, AUTH));
    expect(response.status).toBe(503);
    process.env.DBL_WEBHOOK_AUTH = AUTH;
  });

  it('rejects a wrong or missing Authorization header', async () => {
    expect((await POST(req({ id: USER }, 'wrong'))).status).toBe(401);
    expect((await POST(req({ id: USER }))).status).toBe(401);
  });

  it('rejects a payload with no voter id', async () => {
    expect((await POST(req({ username: 'nobody' }, AUTH))).status).toBe(422);
  });

  it('stores an upvote (DBL votes are never weekend-doubled)', async () => {
    const response = await POST(req({ id: USER, username: 'Tester' }, AUTH));
    expect(response.status).toBe(200);
    const vote = await prisma.topggVote.findFirst({ where: { userId: USER } });
    expect(vote?.isWeekend).toBe(false);
    expect(vote?.claimedGuilds).toEqual([]);
  });
});
