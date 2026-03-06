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
  detectInstalled: () => boolean | Promise<boolean>;
}

export const agents = {
  "claude-code": {
    name: "claude-code",
    displayName: "Claude Code",
    skillsDir: ".claude/skills",
    globalSkillsDir: join(claudeHome, "skills"),
    detectInstalled: () => existsSync(claudeHome),
  },
  cursor: {
    name: "cursor",
    displayName: "Cursor",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(home, ".cursor/skills"),
    detectInstalled: () => existsSync(join(home, ".cursor")),
  },
  codex: {
    name: "codex",
    displayName: "Codex",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(codexHome, "skills"),
    detectInstalled: () => existsSync(codexHome) || existsSync("/etc/codex"),
  },
  opencode: {
    name: "opencode",
    displayName: "OpenCode",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(configHome, "opencode/skills"),
    detectInstalled: () => existsSync(join(configHome, "opencode")),
  },
  cline: {
    name: "cline",
    displayName: "Cline",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(home, ".agents/skills"),
    detectInstalled: () => existsSync(join(home, ".cline")),
  },
  windsurf: {
    name: "windsurf",
    displayName: "Windsurf",
    skillsDir: ".windsurf/skills",
    globalSkillsDir: join(home, ".codeium/windsurf/skills"),
    detectInstalled: () => existsSync(join(home, ".codeium/windsurf")),
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
  roo: {
    name: "roo",
    displayName: "Roo Code",
    skillsDir: ".roo/skills",
    globalSkillsDir: join(home, ".roo/skills"),
    detectInstalled: () => existsSync(join(home, ".roo")),
  },
  continue: {
    name: "continue",
    displayName: "Continue",
    skillsDir: ".continue/skills",
    globalSkillsDir: join(home, ".continue/skills"),
    detectInstalled: () => existsSync(join(process.cwd(), ".continue")) || existsSync(join(home, ".continue")),
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
