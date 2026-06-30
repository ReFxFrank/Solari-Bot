import { SlashCommandBuilder } from 'discord.js';
import {
  DEFAULT_REFX_NODES_URL,
  DEFAULT_REFX_STATUS_URL,
  fetchRefxNodes,
  fetchRefxStatus,
  nodeMetricsLine,
  refxStatusEmoji,
  type RefxNodeMetrics,
  type RefxRegion,
} from '@helios/shared';
import { brandedEmbed, errorEmbed } from '../../lib/embeds';
import { Cooldown } from '../../lib/permissions';
import { env } from '../../env';
import type { Command } from '../../framework/command';

const STATUS_URL = env.REFX_STATUS_URL ?? DEFAULT_REFX_STATUS_URL;
const NODES_URL = env.REFX_NODES_URL ?? DEFAULT_REFX_NODES_URL;
const MAX_NODES_PER_REGION = 12;

function regionLine(region: RefxRegion, metrics?: Map<string, RefxNodeMetrics>): string {
  const header = `${refxStatusEmoji(region.status)} **${region.name}** — ${region.nodesUp}/${region.nodesTotal} nodes up`;
  const shown = region.nodes.slice(0, MAX_NODES_PER_REGION);
  const lines = shown.map((node) => {
    const metric = metrics?.get(node.name);
    const suffix = metric ? nodeMetricsLine(metric) : '';
    return `${refxStatusEmoji(node.status)} \`${node.name}\`${suffix ? ` · ${suffix}` : ''}`;
  });
  if (region.nodes.length > MAX_NODES_PER_REGION) {
    lines.push(`… +${region.nodes.length - MAX_NODES_PER_REGION} more`);
  }
  const body = lines.join('\n');
  return (body ? `${header}\n${body}` : header).slice(0, 1024);
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('refxstatus')
    .setDescription('Show ReFx Hosting node & service status.'),
  preconditions: [Cooldown(10)],
  async execute(interaction) {
    await interaction.deferReply();
    let status;
    try {
      status = await fetchRefxStatus(STATUS_URL);
    } catch {
      await interaction.editReply({
        embeds: [errorEmbed('Couldn’t reach the ReFx status API right now.')],
      });
      return;
    }

    // Best-effort authenticated metrics overlay; falls back silently to the
    // public feed when no token is set or the token is rejected.
    let metricsByRegion: Map<string, Map<string, RefxNodeMetrics>> | null = null;
    try {
      const nodes = await fetchRefxNodes(env.REFX_STATUS_TOKEN, NODES_URL);
      if (nodes) {
        metricsByRegion = new Map(
          nodes.data.regions.map((region) => [
            region.code,
            new Map(region.nodes.map((node) => [node.name, node])),
          ]),
        );
      }
    } catch {
      metricsByRegion = null;
    }

    const data = status.data;
    const embed = brandedEmbed({
      kind: data.status.toLowerCase().includes('operational') ? 'success' : 'warning',
      title: 'ReFx Hosting Status',
      description: `${refxStatusEmoji(data.status)} Overall: **${data.status}**`,
    });

    if (data.components.length) {
      embed.addFields({
        name: 'Services',
        value: data.components
          .map((component) => `${refxStatusEmoji(component.status)} ${component.name}`)
          .join('\n')
          .slice(0, 1024),
      });
    }

    for (const region of data.regions.slice(0, 10)) {
      embed.addFields({ name: '​', value: regionLine(region, metricsByRegion?.get(region.code)) });
    }

    if (data.incidents.active.length) {
      embed.addFields({
        name: '⚠️ Active incidents',
        value: data.incidents.active
          .map((incident) => `• ${incident.title ?? incident.status ?? 'Incident'}`)
          .join('\n')
          .slice(0, 1024),
      });
    }

    if (data.updatedAt) embed.setFooter({ text: `Updated` }).setTimestamp(new Date(data.updatedAt));

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;
