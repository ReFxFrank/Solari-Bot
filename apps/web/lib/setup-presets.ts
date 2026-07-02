import type { Module } from '@solari/shared';
import { MODULE_META } from './modules';

/**
 * Quick-setup bundles for the first-run wizard. Each preset enables a curated
 * set of modules with the bot's own sensible defaults (Tickets even
 * auto-configures its channels). Premium modules in a preset are silently
 * skipped on a free server — the wizard never charges or blocks.
 */
export interface SetupPreset {
  key: string;
  name: string;
  tagline: string;
  /** lucide icon name, resolved in the client component. */
  icon: 'Users' | 'Gamepad2' | 'LifeBuoy' | 'Sparkles';
  modules: Module[];
}

export const SETUP_PRESETS: SetupPreset[] = [
  {
    key: 'community',
    name: 'Community',
    tagline: 'Moderation, auto-mod, welcomes, levels, reaction roles, starboard & logging.',
    icon: 'Users',
    modules: ['MODERATION', 'AUTOMOD', 'WELCOME', 'LEVELING', 'ROLES', 'STARBOARD', 'LOGGING'],
  },
  {
    key: 'gaming',
    name: 'Gaming',
    tagline: 'Community basics plus economy, temp voice channels & giveaways.',
    icon: 'Gamepad2',
    modules: ['MODERATION', 'AUTOMOD', 'WELCOME', 'LEVELING', 'GIVEAWAYS', 'ECONOMY', 'TEMP_VOICE'],
  },
  {
    key: 'support',
    name: 'Support',
    tagline: 'Verification, tickets (auto-configured), logging & autoroles for a help server.',
    icon: 'LifeBuoy',
    modules: ['MODERATION', 'VERIFICATION', 'TICKETS', 'LOGGING', 'AUTOROLE'],
  },
  {
    key: 'everything',
    name: 'Everything',
    tagline: 'Turn on every module and trim later. Premium modules need Premium.',
    icon: 'Sparkles',
    modules: MODULE_META.map((m) => m.module),
  },
];

export function setupPreset(key: string): SetupPreset | null {
  return SETUP_PRESETS.find((preset) => preset.key === key) ?? null;
}
