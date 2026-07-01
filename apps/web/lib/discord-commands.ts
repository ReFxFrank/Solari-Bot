/**
 * Server-side fetch of the application's registered slash commands via the BOT
 * token — the per-command toggle page renders the live list, so it can never
 * drift from what the bot actually registers. Cached briefly like guild
 * entities; bot-token use is server-only.
 */

const DISCORD_API = 'https://discord.com/api/v10';
const CACHE_SECONDS = 300;

export interface SlashCommandInfo {
  name: string;
  description: string;
  /** Flattened subcommands, e.g. "panel" or "group sub" — empty when none. */
  subcommands: { name: string; description: string }[];
}

const SUB_COMMAND = 1;
const SUB_COMMAND_GROUP = 2;

interface RawOption {
  type: number;
  name: string;
  description: string;
  options?: RawOption[];
}

interface RawApplicationCommand {
  name: string;
  description: string;
  /** 1 = CHAT_INPUT; user/message context-menu commands are 2/3. */
  type?: number;
  options?: RawOption[];
}

/** Flatten subcommands and subcommand groups into "sub" / "group sub" entries. */
function flattenSubcommands(options: RawOption[] | undefined): SlashCommandInfo['subcommands'] {
  const out: SlashCommandInfo['subcommands'] = [];
  for (const option of options ?? []) {
    if (option.type === SUB_COMMAND) {
      out.push({ name: option.name, description: option.description });
    } else if (option.type === SUB_COMMAND_GROUP) {
      for (const sub of option.options ?? []) {
        if (sub.type === SUB_COMMAND) {
          out.push({ name: `${option.name} ${sub.name}`, description: sub.description });
        }
      }
    }
  }
  return out;
}

/** All registered global chat-input commands, alphabetically. */
export async function getApplicationCommands(): Promise<SlashCommandInfo[]> {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!token || !clientId) return [];
  try {
    const response = await fetch(`${DISCORD_API}/applications/${clientId}/commands`, {
      headers: { Authorization: `Bot ${token}` },
      next: { revalidate: CACHE_SECONDS },
    });
    if (!response.ok) return [];
    const data = (await response.json()) as RawApplicationCommand[];
    return data
      .filter((command) => (command.type ?? 1) === 1)
      .map((command) => ({
        name: command.name,
        description: command.description,
        subcommands: flattenSubcommands(command.options),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}
