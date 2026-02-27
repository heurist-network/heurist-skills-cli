/**
 * Heurist Skill Marketplace API client.
 *
 * All requests go through the marketplace API hosted at mesh.heurist.ai
 * (or a custom base URL via HEURIST_SKILLS_API env var).
 */

const DEFAULT_API_URL = "https://mesh.heurist.ai";

function getBaseUrl(): string {
  return process.env["HEURIST_SKILLS_API"] || DEFAULT_API_URL;
}

export interface SkillSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string | null;
  risk_tier: string | null;
  verification_status: string;
  author: {
    display_name?: string;
    author_type?: string;
    github_username?: string;
  };
  file_url: string | null;
  capabilities: {
    requires_secrets: boolean;
    requires_private_keys: boolean;
    requires_exchange_api_keys: boolean;
    can_sign_transactions: boolean;
    uses_leverage: boolean;
    accesses_user_portfolio: boolean;
  };
}

export interface SkillDetail extends SkillSummary {
  source_type: string | null;
  source_url: string | null;
  approved_sha256: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SkillFileEntry {
  path: string;
  size: number;
}

export interface SkillListResponse {
  skills: SkillSummary[];
  total: number;
}

export interface UpdateInfo {
  slug: string;
  approved_sha256: string;
  file_url: string;
}

async function fetchJson<T>(path: string): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const resp = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!resp.ok) {
    throw new Error(`API error ${resp.status}: ${resp.statusText} (${url})`);
  }
  return resp.json() as Promise<T>;
}

/** List skills from the marketplace. */
export async function listSkills(opts?: {
  category?: string;
  search?: string;
  offset?: number;
  limit?: number;
}): Promise<SkillListResponse> {
  const params = new URLSearchParams();
  if (opts?.category) params.set("category", opts.category);
  if (opts?.search) params.set("search", opts.search);
  if (opts?.offset) params.set("offset", String(opts.offset));
  if (opts?.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();
  return fetchJson<SkillListResponse>(`/skills${qs ? `?${qs}` : ""}`);
}

/** Get full skill details by slug. */
export async function getSkill(slug: string): Promise<SkillDetail> {
  return fetchJson<SkillDetail>(`/skills/${slug}`);
}

/** List files inside a skill bundle. */
export async function listSkillFiles(
  slug: string,
): Promise<{ slug: string; file_count: number; files: SkillFileEntry[] }> {
  return fetchJson(`/skills/${slug}/files`);
}

/** Download skill content (SKILL.md or zip bundle). */
export async function downloadSkill(
  slug: string,
): Promise<{ content: Buffer; sha256: string; isZip: boolean; filename: string }> {
  const url = `${getBaseUrl()}/skills/${slug}/download`;
  const resp = await fetch(url, {
    signal: AbortSignal.timeout(60_000),
  });
  if (!resp.ok) {
    throw new Error(`Download failed ${resp.status}: ${resp.statusText}`);
  }

  const sha256 = resp.headers.get("X-Skill-SHA256") || "";
  const disposition = resp.headers.get("Content-Disposition") || "";
  const contentType = resp.headers.get("Content-Type") || "";
  const isZip =
    contentType.includes("zip") || disposition.includes(".zip");

  const filenameMatch = disposition.match(/filename="(.+?)"/);
  const filename = filenameMatch?.[1] || `${slug}-SKILL.md`;

  const arrayBuffer = await resp.arrayBuffer();
  const content = Buffer.from(arrayBuffer);

  return { content, sha256, isZip, filename };
}

/** Check for updates to installed skills. */
export async function checkUpdates(
  installed: { slug: string; sha256: string }[],
): Promise<UpdateInfo[]> {
  const url = `${getBaseUrl()}/check-updates`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ installed }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!resp.ok) {
    throw new Error(`Check updates failed ${resp.status}: ${resp.statusText}`);
  }
  const data = (await resp.json()) as { updates: UpdateInfo[] };
  return data.updates;
}
