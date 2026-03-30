---
id: mcp-guide-v1
status: Final
version: v1
last_updated: 2026-03-30
---

# MCP Integration Guide
> Model Context Protocol — extending Claude Code with external tools

## Overview

MCP (Model Context Protocol) servers give Claude Code tools to interact with external systems: databases, APIs, filesystems, browsers, and more. This guide covers which MCPs to use, how to configure them safely, and what to avoid.

**Rule**: Fewer active tools = sharper execution. Keep under 10 MCPs active per project.

---

## Recommended MCPs for Orbit Projects

### Tier 1: Always Enable (Core)

#### `filesystem`
- **Purpose**: Read/write files outside the project directory (home dir, system configs)
- **Install**: Built into Claude Code
- **Config**: Restrict to specific paths — never allow `/` or `~` without path constraint
- **When**: Any project needing file operations beyond the project root

#### `git`
- **Purpose**: Git operations (log, diff, blame, stash) through structured API
- **Install**: Built into Claude Code
- **When**: Default on — always useful for repo context

#### `fetch` / `web-fetch`
- **Purpose**: Fetch URLs (docs, APIs, GitHub raw content)
- **Install**: Built into Claude Code
- **When**: Research tasks, API integration, reading external docs

---

### Tier 2: Add Per Project Type

#### `github` (GitHub MCP)
- **Purpose**: GitHub API — issues, PRs, releases, Actions status
- **Install**: `npx @modelcontextprotocol/server-github`
- **Env**: `GITHUB_TOKEN=ghp_...` (fine-grained PAT, minimal permissions)
- **When**: Any project with GitHub-hosted repo
- **Permissions needed**: `read:repo`, `write:issues`, `read:pull_requests`

#### `postgres` / `sqlite`
- **Purpose**: Direct DB queries for schema inspection, debugging, data analysis
- **Install**: `npx @modelcontextprotocol/server-postgres`
- **Env**: `DATABASE_URL=postgresql://...`
- **When**: Backend projects with a database
- **CAUTION**: Never connect to production with write access. Read-only connection string recommended.

#### `brave-search` / `tavily`
- **Purpose**: Web search for research tasks
- **Install**: `npx @modelcontextprotocol/server-brave-search`
- **Env**: `BRAVE_API_KEY=...`
- **When**: Researcher agent tasks, competitive analysis

#### `slack`
- **Purpose**: Send messages, read channels (PostCommit/PostDeploy hooks)
- **Install**: `npx @modelcontextprotocol/server-slack`
- **Env**: `SLACK_BOT_TOKEN=xoxb-...`
- **When**: Team notification integration in hooks

---

### Tier 3: Specialized Use Cases

#### `puppeteer` / `playwright`
- **Purpose**: Browser automation — screenshot, scraping, E2E testing
- **Install**: `npx @modelcontextprotocol/server-puppeteer`
- **When**: UI testing, web scraping research, visual verification
- **CAUTION**: Sandboxed execution only — don't let it access authenticated sessions

#### `linear`
- **Purpose**: Linear issue management — create, update, list issues
- **Install**: `npx @modelcontextprotocol/server-linear`
- **Env**: `LINEAR_API_KEY=lin_api_...`
- **When**: Soupler projects tracked in Linear

#### `sentry`
- **Purpose**: Read Sentry errors, stack traces, issue context
- **Install**: `npx @modelcontextprotocol/server-sentry`
- **Env**: `SENTRY_AUTH_TOKEN=...`, `SENTRY_ORG=soupler`
- **When**: Debugging production errors during `/orbit:debug`

---

## Configuration Pattern

Add to `.claude/settings.json` in your project:
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "${DATABASE_URL_READONLY}"]
    },
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "${BRAVE_API_KEY}"
      }
    }
  }
}
```

**Best practice**: Use environment variable references (`${VAR}`) — never hardcode credentials in settings.json.

---

## Security Guidelines

### MCP Supply Chain Safety
```
□ Only install MCPs from: official @modelcontextprotocol/, trusted vendors, or your own
□ Pin MCP versions in package.json (don't use -y for production installs)
□ Review MCP source code before enabling (especially for credential access)
□ Scan installed MCP packages: npm audit
□ Never install MCPs from untrusted GitHub repos
```

### Access Principles
```
□ Minimum privilege: read-only DB connections where possible
□ Scoped tokens: GitHub PAT with only required permissions
□ No production write access from development MCP configs
□ Rotate credentials monthly
□ Separate MCP credentials from application credentials
```

### Tool Count Limits
```
Keep active MCPs ≤ 10 per project
Keep active tools ≤ 80 total (MCPs expose multiple tools each)
Disable MCPs not needed for current task
More tools = larger context overhead = slower, less precise responses
```

---

## Per-Environment MCP Configuration

```
Development:   GitHub (read/write) + postgres (readwrite) + brave-search
Staging:       GitHub (read-only) + postgres (read-only) + sentry
Production:    Nothing — never connect Claude Code to production systems
```

---

## Orbit Agent → MCP Mapping

| Agent | Recommended MCPs |
|-------|-----------------|
| researcher | brave-search, fetch, github |
| engineer | github, filesystem, postgres (readonly) |
| devops | github, sentry (staging) |
| security-engineer | github, sentry |
| data-engineer | postgres, filesystem |
| designer | fetch, filesystem |
| reviewer | github, filesystem |

---

## Avoid These MCPs
- **Any MCP with unrestricted shell exec** — same as giving arbitrary code execution
- **MCPs connecting directly to production databases with write access**
- **Unvetted community MCPs with credential access** — supply chain risk
- **MCPs that phone home** (send usage data to third parties) for private code
