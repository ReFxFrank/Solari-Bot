import { describe, expect, it } from 'vitest';
import { verificationConfigSchema } from './verification';

describe('verificationConfigSchema', () => {
  it('fills sensible defaults', () => {
    const config = verificationConfigSchema.parse({});
    expect(config.method).toBe('button');
    expect(config.buttonLabel).toBe('Verify');
    expect(config.verifiedRoleId).toBe('');
    expect(config.captchaLength).toBe(5);
    expect(config.maxAttempts).toBe(3);
    expect(config.failAction).toBe('none');
    expect(config.logChannelId).toBeNull();
  });

  it('accepts a legacy automod verification blob (compatible field names)', () => {
    const config = verificationConfigSchema.parse({
      enabled: true, // legacy key — stripped, module enable is separate now
      verifiedRoleId: '123',
      unverifiedRoleId: '456',
      buttonLabel: 'Let me in',
      panelTitle: 'Gate',
      panelMessage: 'Prove it',
      successMessage: 'Welcome',
    });
    expect(config.verifiedRoleId).toBe('123');
    expect(config.unverifiedRoleId).toBe('456');
    expect(config.buttonLabel).toBe('Let me in');
    expect('enabled' in config).toBe(false);
  });

  it('bounds captcha settings', () => {
    expect(() => verificationConfigSchema.parse({ captchaLength: 3 })).toThrow();
    expect(() => verificationConfigSchema.parse({ captchaLength: 9 })).toThrow();
    expect(() => verificationConfigSchema.parse({ maxAttempts: 0 })).toThrow();
    expect(() => verificationConfigSchema.parse({ failAction: 'ban' })).toThrow();
  });
});
