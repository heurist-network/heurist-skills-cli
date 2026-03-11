import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const home = homedir();
const configHome = process.env["XDG_CONFIG_HOME"]?.trim() || join(home, ".config");
const codexHome = process.env["CODEX_HOME"]?.trim() || join(home, ".codex");
const claudeHome = process.env["CLAUDE_CONFIG_DIR"]?.trim() || join(home, ".claude");

export interface AgentConfig {
  name: string;
  displayName: string;
  skillsDir: string;
  globalSkillsDir?: string;
  showInUniversalList?: boolean;
  detectInstalled: () => boolean | Promise<boolean>;
}

export function getOpenClawGlobalSkillsDir(
  homeDir = home,
  pathExists: (path: string) => boolean = existsSync,
): string {
  if (pathExists(join(homeDir, ".openclaw"))) {
    return join(homeDir, ".openclaw/skills");
  }
  if (pathExists(join(homeDir, ".clawdbot"))) {
    return join(homeDir, ".clawdbot/skills");
  }
  if (pathExists(join(homeDir, ".moltbot"))) {
    return join(homeDir, ".moltbot/skills");
  }
  return join(homeDir, ".openclaw/skills");
}

export const agents = {
  adal: {
    name: "adal",
    displayName: "AdaL",
    skillsDir: ".adal/skills",
    globalSkillsDir: join(home, ".adal/skills"),
    detectInstalled: () => existsSync(join(home, ".adal")),
  },
  amp: {
    name: "amp",
    displayName: "Amp",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(configHome, "agents/skills"),
    detectInstalled: () => existsSync(join(configHome, "amp")),
  },
  antigravity: {
    name: "antigravity",
    displayName: "Antigravity",
    skillsDir: ".agent/skills",
    globalSkillsDir: join(home, ".gemini/antigravity/skills"),
    detectInstalled: () => existsSync(join(home, ".gemini/antigravity")),
  },
  augment: {
    name: "augment",
    displayName: "Augment",
    skillsDir: ".augment/skills",
    globalSkillsDir: join(home, ".augment/skills"),
    detectInstalled: () => existsSync(join(home, ".augment")),
  },
  "claude-code": {
    name: "claude-code",
    displayName: "Claude Code",
    skillsDir: ".claude/skills",
    globalSkillsDir: join(claudeHome, "skills"),
    detectInstalled: () => existsSync(claudeHome),
  },
  cline: {
    name: "cline",
    displayName: "Cline",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(home, ".agents/skills"),
    detectInstalled: () => existsSync(join(home, ".cline")),
  },
  codebuddy: {
    name: "codebuddy",
    displayName: "CodeBuddy",
    skillsDir: ".codebuddy/skills",
    globalSkillsDir: join(home, ".codebuddy/skills"),
    detectInstalled: () =>
      existsSync(join(process.cwd(), ".codebuddy")) || existsSync(join(home, ".codebuddy")),
  },
  codex: {
    name: "codex",
    displayName: "Codex",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(codexHome, "skills"),
    detectInstalled: () => existsSync(codexHome) || existsSync("/etc/codex"),
  },
  "command-code": {
    name: "command-code",
    displayName: "Command Code",
    skillsDir: ".commandcode/skills",
    globalSkillsDir: join(home, ".commandcode/skills"),
    detectInstalled: () => existsSync(join(home, ".commandcode")),
  },
  continue: {
    name: "continue",
    displayName: "Continue",
    skillsDir: ".continue/skills",
    globalSkillsDir: join(home, ".continue/skills"),
    detectInstalled: () =>
      existsSync(join(process.cwd(), ".continue")) || existsSync(join(home, ".continue")),
  },
  cortex: {
    name: "cortex",
    displayName: "Cortex Code",
    skillsDir: ".cortex/skills",
    globalSkillsDir: join(home, ".snowflake/cortex/skills"),
    detectInstalled: () => existsSync(join(home, ".snowflake/cortex")),
  },
  crush: {
    name: "crush",
    displayName: "Crush",
    skillsDir: ".crush/skills",
    globalSkillsDir: join(home, ".config/crush/skills"),
    detectInstalled: () => existsSync(join(home, ".config/crush")),
  },
  cursor: {
    name: "cursor",
    displayName: "Cursor",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(home, ".cursor/skills"),
    detectInstalled: () => existsSync(join(home, ".cursor")),
  },
  droid: {
    name: "droid",
    displayName: "Droid",
    skillsDir: ".factory/skills",
    globalSkillsDir: join(home, ".factory/skills"),
    detectInstalled: () => existsSync(join(home, ".factory")),
  },
  "gemini-cli": {
    name: "gemini-cli",
    displayName: "Gemini CLI",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(home, ".gemini/skills"),
    detectInstalled: () => existsSync(join(home, ".gemini")),
  },
  "github-copilot": {
    name: "github-copilot",
    displayName: "GitHub Copilot",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(home, ".copilot/skills"),
    detectInstalled: () => existsSync(join(home, ".copilot")),
  },
  goose: {
    name: "goose",
    displayName: "Goose",
    skillsDir: ".goose/skills",
    globalSkillsDir: join(configHome, "goose/skills"),
    detectInstalled: () => existsSync(join(configHome, "goose")),
  },
  "iflow-cli": {
    name: "iflow-cli",
    displayName: "iFlow CLI",
    skillsDir: ".iflow/skills",
    globalSkillsDir: join(home, ".iflow/skills"),
    detectInstalled: () => existsSync(join(home, ".iflow")),
  },
  junie: {
    name: "junie",
    displayName: "Junie",
    skillsDir: ".junie/skills",
    globalSkillsDir: join(home, ".junie/skills"),
    detectInstalled: () => existsSync(join(home, ".junie")),
  },
  kilo: {
    name: "kilo",
    displayName: "Kilo Code",
    skillsDir: ".kilocode/skills",
    globalSkillsDir: join(home, ".kilocode/skills"),
    detectInstalled: () => existsSync(join(home, ".kilocode")),
  },
  "kimi-cli": {
    name: "kimi-cli",
    displayName: "Kimi Code CLI",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(home, ".config/agents/skills"),
    detectInstalled: () => existsSync(join(home, ".kimi")),
  },
  "kiro-cli": {
    name: "kiro-cli",
    displayName: "Kiro CLI",
    skillsDir: ".kiro/skills",
    globalSkillsDir: join(home, ".kiro/skills"),
    detectInstalled: () => existsSync(join(home, ".kiro")),
  },
  kode: {
    name: "kode",
    displayName: "Kode",
    skillsDir: ".kode/skills",
    globalSkillsDir: join(home, ".kode/skills"),
    detectInstalled: () => existsSync(join(home, ".kode")),
  },
  mcpjam: {
    name: "mcpjam",
    displayName: "MCPJam",
    skillsDir: ".mcpjam/skills",
    globalSkillsDir: join(home, ".mcpjam/skills"),
    detectInstalled: () => existsSync(join(home, ".mcpjam")),
  },
  "mistral-vibe": {
    name: "mistral-vibe",
    displayName: "Mistral Vibe",
    skillsDir: ".vibe/skills",
    globalSkillsDir: join(home, ".vibe/skills"),
    detectInstalled: () => existsSync(join(home, ".vibe")),
  },
  mux: {
    name: "mux",
    displayName: "Mux",
    skillsDir: ".mux/skills",
    globalSkillsDir: join(home, ".mux/skills"),
    detectInstalled: () => existsSync(join(home, ".mux")),
  },
  neovate: {
    name: "neovate",
    displayName: "Neovate",
    skillsDir: ".neovate/skills",
    globalSkillsDir: join(home, ".neovate/skills"),
    detectInstalled: () => existsSync(join(home, ".neovate")),
  },
  openclaw: {
    name: "openclaw",
    displayName: "OpenClaw",
    skillsDir: "skills",
    globalSkillsDir: getOpenClawGlobalSkillsDir(),
    detectInstalled: () =>
      existsSync(join(home, ".openclaw")) ||
      existsSync(join(home, ".clawdbot")) ||
      existsSync(join(home, ".moltbot")),
  },
  opencode: {
    name: "opencode",
    displayName: "OpenCode",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(configHome, "opencode/skills"),
    detectInstalled: () => existsSync(join(configHome, "opencode")),
  },
  openhands: {
    name: "openhands",
    displayName: "OpenHands",
    skillsDir: ".openhands/skills",
    globalSkillsDir: join(home, ".openhands/skills"),
    detectInstalled: () => existsSync(join(home, ".openhands")),
  },
  pi: {
    name: "pi",
    displayName: "Pi",
    skillsDir: ".pi/skills",
    globalSkillsDir: join(home, ".pi/agent/skills"),
    detectInstalled: () => existsSync(join(home, ".pi/agent")),
  },
  pochi: {
    name: "pochi",
    displayName: "Pochi",
    skillsDir: ".pochi/skills",
    globalSkillsDir: join(home, ".pochi/skills"),
    detectInstalled: () => existsSync(join(home, ".pochi")),
  },
  qoder: {
    name: "qoder",
    displayName: "Qoder",
    skillsDir: ".qoder/skills",
    globalSkillsDir: join(home, ".qoder/skills"),
    detectInstalled: () => existsSync(join(home, ".qoder")),
  },
  "qwen-code": {
    name: "qwen-code",
    displayName: "Qwen Code",
    skillsDir: ".qwen/skills",
    globalSkillsDir: join(home, ".qwen/skills"),
    detectInstalled: () => existsSync(join(home, ".qwen")),
  },
  roo: {
    name: "roo",
    displayName: "Roo Code",
    skillsDir: ".roo/skills",
    globalSkillsDir: join(home, ".roo/skills"),
    detectInstalled: () => existsSync(join(home, ".roo")),
  },
  trae: {
    name: "trae",
    displayName: "Trae",
    skillsDir: ".trae/skills",
    globalSkillsDir: join(home, ".trae/skills"),
    detectInstalled: () => existsSync(join(home, ".trae")),
  },
  "trae-cn": {
    name: "trae-cn",
    displayName: "Trae CN",
    skillsDir: ".trae/skills",
    globalSkillsDir: join(home, ".trae-cn/skills"),
    detectInstalled: () => existsSync(join(home, ".trae-cn")),
  },
  windsurf: {
    name: "windsurf",
    displayName: "Windsurf",
    skillsDir: ".windsurf/skills",
    globalSkillsDir: join(home, ".codeium/windsurf/skills"),
    detectInstalled: () => existsSync(join(home, ".codeium/windsurf")),
  },
  zencoder: {
    name: "zencoder",
    displayName: "Zencoder",
    skillsDir: ".zencoder/skills",
    globalSkillsDir: join(home, ".zencoder/skills"),
    detectInstalled: () => existsSync(join(home, ".zencoder")),
  },
} as const satisfies Record<string, AgentConfig>;

export type AgentType = keyof typeof agents;

export async function detectInstalledAgents(): Promise<AgentType[]> {
  const installed: AgentType[] = [];
  for (const key of Object.keys(agents) as AgentType[]) {
    if (await agents[key].detectInstalled()) {
      installed.push(key);
    }
  }
  return installed;
}

export function isValidAgent(value: string): value is AgentType {
  return value in agents;
}

export function isUniversalAgent(type: AgentType): boolean {
  return agents[type].skillsDir === ".agents/skills";
}

export function getUniversalAgents(): AgentType[] {
  return (Object.keys(agents) as AgentType[]).filter(isUniversalAgent);
}

export function getNonUniversalAgents(): AgentType[] {
  return (Object.keys(agents) as AgentType[]).filter((type) => !isUniversalAgent(type));
}
