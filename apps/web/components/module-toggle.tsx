'use client';

import { useEffect, useState, useTransition } from 'react';
import type { Module } from '@solari/shared';
import { setModuleEnabled } from '../lib/config-actions';
import { Switch } from './ui/switch';

export function ModuleToggle({
  guildId,
  module,
  initialEnabled,
  label,
}: {
  guildId: string;
  module: Module;
  initialEnabled: boolean;
  label: string;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();

  // Server-driven changes must win over the optimistic local state — e.g. the
  // bulk enable/disable-all buttons revalidating the page.
  useEffect(() => {
    setEnabled(initialEnabled);
  }, [initialEnabled]);

  function toggle(next: boolean): void {
    setEnabled(next); // optimistic
    startTransition(async () => {
      try {
        await setModuleEnabled(guildId, module, next);
      } catch {
        setEnabled(!next); // revert on failure
      }
    });
  }

  return (
    <Switch checked={enabled} disabled={pending} onChange={toggle} label={`Toggle ${label}`} />
  );
}
