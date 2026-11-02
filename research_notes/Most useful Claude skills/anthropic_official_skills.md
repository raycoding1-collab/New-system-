# Anthropic's first-party Agent Skills and Claude Code plugins (as of 2 November 2026)

Research date: 2026-11-02. Method:
- I shallow-cloned github.com/anthropics/skills and github.com/anthropics/claude-plugins-official, then deepened the skills clone to its full history of 61 commits. Every SKILL.md, LICENSE.txt and marketplace.json was read from the clones.
- GitHub stars and push dates came from `gh api search/repositories`.
- Plugin install counts came from claude.com/plugins/<name> via WebFetch.
- skills.sh, skillselion.com and officialskills.sh are **outside this session's allowed network domains**: DNS fails with ENOTFOUND, and a curl attempt was refused. So **no skills.sh number below was seen first-hand.** Each one comes from a search-engine snippet of the skills.sh page and is marked as such.

## 1. What skills does anthropics/skills contain, with exact name, path and license?

### Takeaway
On 2 November 2026 the repo has **19 skills** under `skills/`, plus `template/SKILL.md` and a pointer to the spec.
- **15 are Apache-2.0.**
- **4 are proprietary "source-available" document skills:** docx, pdf, pptx and xlsx. Their LICENSE forbids copying or redistributing them.
- **1 has no license file:** doc-coauthoring.

The repo has no top-level license. It ships five Claude Code plugins through its own marketplace, `anthropic-agent-skills`.

### Cited Findings

**Repo-level facts**
- The repo has `skills/` (19 folders), `spec/agent-skills-spec.md` and `template/SKILL.md`. The spec file now only says "The spec is now located at <https://agentskills.io/specification>". — [anthropics/skills tree](https://github.com/anthropics/skills/tree/main), [spec file](https://github.com/anthropics/skills/blob/main/spec/agent-skills-spec.md)
- From the README:
  - "Many skills in this repo are open source (Apache 2.0)."
  - docx, pdf, pptx and xlsx "power Claude's document capabilities… These are source-available, not open source".
  - "These example skills are all already available to paid plans in Claude.ai."
  - "**These skills are provided for demonstration and educational purposes only.**"
  — [README](https://github.com/anthropics/skills/blob/main/README.md)
- GitHub reports `license: null` for the repo, so there is no top-level LICENSE. Licensing is set per skill folder. — `gh api search/repositories q=repo:anthropics/skills`, run 2026-11-02 ([repo](https://github.com/anthropics/skills))
- The marketplace `anthropic-agent-skills` lists five plugins. Its owner is "Keith Lazuka" (klazuka@anthropic.com). — [.claude-plugin/marketplace.json](https://github.com/anthropics/skills/blob/main/.claude-plugin/marketplace.json)
  - `document-skills`: xlsx, docx, pptx, pdf
  - `example-skills`: algorithmic-art, brand-guidelines, canvas-design, doc-coauthoring, frontend-design, internal-comms, mcp-builder, skill-creator, slack-gif-creator, theme-factory, web-artifacts-builder, webapp-testing
  - `claude-api`
  - `academy-guide`
  - `discernment-nudge`

**The proprietary document-skill license** (identical text in docx, pdf, pptx and xlsx)
- It opens "© 2025 Anthropic, PBC. All rights reserved." Users may not:
  - "Extract these materials from the Services or retain copies of these materials outside the Services"
  - "Reproduce or copy these materials, except for temporary copies created automatically during authorized use of the Services"
  - "Create derivative works"
  - "Distribute, sublicense, or transfer these materials to any third party"
  - reverse engineer them.
  — [skills/docx/LICENSE.txt](https://github.com/anthropics/skills/blob/main/skills/docx/LICENSE.txt). The same file sits in [pdf](https://github.com/anthropics/skills/blob/main/skills/pdf/LICENSE.txt), [pptx](https://github.com/anthropics/skills/blob/main/skills/pptx/LICENSE.txt) and [xlsx](https://github.com/anthropics/skills/blob/main/skills/xlsx/LICENSE.txt).

**Per-skill inventory**

How to read the table:
- **Install name** is the folder name, as in `npx skills add anthropics/skills --skill <name>`.
- **Path** is `skills/<name>/` in every case.
- **Added** is when SKILL.md first appeared at its current path. The repo was reorganised into `skills/` on 2025-12-01, so earlier skills show that date. The first commit in the history is 2025-10-15.
- **Last change** comes from `git log -- skills/<name>`.

All facts come from each folder's SKILL.md and LICENSE.txt ([skills/ tree](https://github.com/anthropics/skills/tree/main/skills)) and the commit history ([commits](https://github.com/anthropics/skills/commits/main)).

| Install name | License (LICENSE.txt) | What it does (from SKILL.md frontmatter) | SKILL.md lines / files | Added → last change |
|---|---|---|---|---|
| `academy-guide` | Apache-2.0 | Recommends Claude Academy (academy.claude.com) courses when someone asks how to use Claude or a Claude product. | 147 / 2 | 2026-08-18 → 2026-08-18. Renamed from `claude-academy-guide`. |
| `algorithmic-art` | Apache-2.0 | "Creating algorithmic art using p5.js with seeded randomness and interactive parameter exploration": generative art, flow fields, particle systems. | 404 / 4 | 2025-12-01 → 2026-04-20 |
| `brand-guidelines` | Apache-2.0 | "Applies Anthropic's official brand colors and typography to any sort of artifact". | 73 / 2 | 2025-12-01 → 2026-04-20 |
| `canvas-design` | Apache-2.0 | "Create beautiful visual art in .png and .pdf documents using design philosophy": posters, art, static designs. Bundles fonts (83 files). | 129 / 83 | 2025-12-01 → 2026-04-20 |
| `claude-api` | Apache-2.0 | Reference for the Claude API and Anthropic SDK: model ids, pricing, streaming, tool use, MCP, agents, caching, migration. | 616 / 96 | 2026-03-04 → 2026-10-09: "dynamic workflows and the four workflow quickstarts" |
| `discernment-nudge` | Apache-2.0 | After a substantive answer, "append 2-3 short follow-up questions" so the user can check facts, assumptions and missing context. | 209 / 2 | 2026-08-17 → 2026-08-17 (#1553) |
| `doc-coauthoring` | **No LICENSE.txt and no `license:` frontmatter** | "Guide users through a structured workflow for co-authoring documentation": proposals, technical specs, decision docs. | 375 / 1 | 2025-12-04 → 2025-12-04 (#134) |
| `docx` | **Proprietary / source-available** | Create, read and edit Word .docx/.dotx files: tracked changes, comments, templates, find-and-replace. | 91 / 61 | 2025-12-01 → 2026-07-16 (#1447) |
| `frontend-design` | Apache-2.0 | "Guidance for distinctive, intentional visual design when building new UI or reshaping an existing one… choices that don't read as templated defaults." | 71 / 2 | 2025-12-01 → 2026-09-03: "Update frontend-design skill to avoid generic design defaults (#1713)" |
| `internal-comms` | Apache-2.0 | Status reports, leadership updates, 3P updates, newsletters, FAQs, incident reports, written in "the formats that my company likes". | 32 / 6 | 2025-12-01 → 2026-04-20 |
| `mcp-builder` | Apache-2.0 | "Guide for creating high-quality MCP… servers", in Python (FastMCP) or Node/TypeScript. | 252 / 11 | 2025-12-01 → **2026-10-28**: "teach v2 of the MCP TypeScript SDK (#2087)". This is the repo's latest commit. |
| `pdf` | **Proprietary** (frontmatter says "Proprietary. LICENSE.txt has complete terms") | Read, extract, merge, split, rotate, watermark, create, fill forms, encrypt, OCR. | 314 / 12 | 2025-12-01 → 2026-02-06 |
| `pptx` | **Proprietary** | Anything involving .pptx/.potx files: create, read, edit, templates, speaker notes. | 238 / 56 | 2025-12-01 → 2026-07-16 (#1447) |
| `skill-creator` | Apache-2.0 | "Create new skills, modify and improve existing skills, and measure skill performance… run evals… benchmark… optimize a skill's description for better triggering accuracy." Ships `agents/` (analyzer, comparator, grader), `eval-viewer/`, and `scripts/` (run_eval, run_loop, improve_description, package_skill, quick_validate…). | 485 / 18 | 2025-12-01 → 2026-04-20 |
| `slack-gif-creator` | Apache-2.0 | Animated GIFs sized for Slack, with validation tools. | 254 / 7 | 2025-12-01 → 2026-04-20 |
| `theme-factory` | Apache-2.0 | Ten preset themes (arctic-frost, botanical-garden, desert-rose, forest-canopy, golden-hour, midnight-galaxy, modern-minimalist, ocean-depths, sunset-boulevard, tech-innovation) for slides, docs and HTML pages, or a theme generated on the fly. | 59 / 13 | 2025-12-01 → 2026-04-20 |
| `web-artifacts-builder` | Apache-2.0 | Multi-component **claude.ai HTML artifacts**: React 18 + TS + Vite + Parcel + Tailwind + shadcn/ui, bundled to one HTML file with `scripts/init-artifact.sh` and `bundle-artifact.sh`. | 73 / 5 | 2025-12-01 → 2026-04-20 |
| `webapp-testing` | Apache-2.0 | "Toolkit for interacting with and testing local web applications using Playwright". It writes **native Python Playwright scripts** and uses `scripts/with_server.py` to manage the server lifecycle. | 95 / 6 | 2025-12-01 → 2026-04-20 |
| `xlsx` | **Proprietary** | Spreadsheet input or output: .xlsx/.xlsm/.csv/.tsv, formulas, charts, cleaning. | 99 / 53 | 2025-12-01 → 2026-07-16 (#1447) |

**Content of the current frontend-design skill**
The 2026-09-03 rewrite takes the stance "Approach this as the design lead at a design studio". It:
- requires a two-pass process: a design plan of 4–6 named hex values, typefaces, ASCII wireframes and principles, then "review that plan against the brief" before coding;
- lists five "AI-generated design" clusters to avoid, including the cream background near #F4F1EA with a terracotta accent near #D97757, the "SaaS-card kit", and "a '→' appended to link and button text";
- says to "Use non-user-triggered motion sparingly", "Spend your boldness in one place", and to screenshot and self-critique.
— [skills/frontend-design/SKILL.md](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md)

**The plugin copies match the repo**
- The `frontend-design` plugin (v1.1.1) in claude-plugins-official contains a byte-identical SKILL.md body.
- The `skill-creator` plugin's skill folder matches the repo's except for LICENSE.txt.
— Local diff of [claude-plugins-official/plugins/frontend-design](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/frontend-design) and [plugins/skill-creator](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/skill-creator) against anthropics/skills

**Open bug: duplicate skills when installing through the plugin marketplace**
- Issue #189 (opened 2025-12-30, still open, no maintainer reply) reports that installing `document-skills` and `example-skills` loads *all* skills into *each* plugin, "reportedly waste[s] about 50k tokens". `claude-api@anthropic-agent-skills` is also affected.
- Root cause: each plugin uses `"source": "./"`, and Claude Code auto-discovers the whole `skills/` folder.
- The proposed fix, PR #551, was still unmerged as of a 2026-05-06 comment.
— [issue #189](https://github.com/anthropics/skills/issues/189)
- The current marketplace.json (2 November 2026) still has `"source": "./"` for all five plugins. — [marketplace.json](https://github.com/anthropics/skills/blob/main/.claude-plugin/marketplace.json)

**How to install**
- Plugin route, from the README: `/plugin marketplace add anthropics/skills`, then `/plugin install document-skills@anthropic-agent-skills` or `/plugin install example-skills@anthropic-agent-skills`. — [README](https://github.com/anthropics/skills/blob/main/README.md)
- skills CLI route (per search snippets of skills.sh): `npx skills add anthropics/skills`, or one skill at a time, e.g. `npx skills add anthropics/skills@webapp-testing`. — [skills.sh/anthropics/skills](https://www.skills.sh/anthropics/skills), via search snippet (not fetched)
- This project's rule (CLAUDE.md) for project installs: `npx skills add anthropics/skills --skill <name> --agent claude-code --copy -y`. — /home/user/New-system-/CLAUDE.md

### Inferences

**Overlap with this project and likely usefulness**

Already installed here: Taste, Impeccable, Emil's skills, find-skills, Figma MCP and Playwright MCP.

- **Already available in this session, so don't install again:**
  - `docx`, `pdf`, `pptx`, `xlsx` and `skill-creator` already appear as `anthropic-skills:*` skills synced from the user's claude.ai account into `/root/.claude/skills/synced/`. I observed this in this session's skill list and on the filesystem.
  - `claude-api` is also a bundled Claude Code skill (`/claude-api`, see question 4) and appears in this session's skill list.
- **Don't commit the four document skills to this repo.** Copying docx/pdf/pptx/xlsx into `.claude/skills/` with `--copy` and committing them looks like it conflicts with the license ("retain copies… outside the Services", "Distribute"). This is my reading, not legal advice. Rely on the synced versions or the plugin instead.
- **High overlap, likely conflicting:**
  - `frontend-design` triggers on "building new UI or reshaping an existing one". Under this project's CLAUDE.md, Taste owns exactly that. Installing it would give the model two competing art-direction skills.
  - `theme-factory` (preset themes) clashes with Taste's direction draw.
  - `brand-guidelines` is Anthropic's own brand only.
  - If frontend-design is wanted at all, use it as reading material, or install it with visibility reduced through `skillOverrides` (see question 4).
- **Overlap with the existing browser tooling:** `webapp-testing` writes Python Playwright scripts. Playwright MCP plus Taste's `inspect.mjs` already cover that, so the marginal value is low.
- **Plausibly useful additions here:**
  - `skill-creator`: evals and description tuning for the project's own skills. It is already present via sync, but not committed to the repo.
  - `canvas-design`: posters and OG images as PNG/PDF.
  - `algorithmic-art`: p5.js generative hero art. It could feed Taste's "draw the pictures" fallback.
  - `doc-coauthoring`: writing briefs and specs before `/build-website`. Its license is unclear.
  - `web-artifacts-builder`: only for single-file claude.ai artifacts.
- **Low relevance to a website design team:** `internal-comms`, `slack-gif-creator`, `mcp-builder`, `academy-guide`, `discernment-nudge`.

### Gaps
- doc-coauthoring has no license file, and the repo has no top-level LICENSE. Its legal terms are unclear; I found no statement from Anthropic on it.
- The "added" dates reflect the 2025-12-01 restructure, not the true first publication. The repo had an older layout before that. The engineering post dates the launch to 2025-10-16.

## 2. skills.sh install counts and leaderboard rank

### Takeaway
I could not open skills.sh in this session because the host is outside the allowed domains, so none of these numbers were verified first-hand.

Search-engine snippets of skills.sh pages give:

| Skill | Installs | Freshness |
|---|---|---|
| frontend-design | about 1.1M | |
| skill-creator | about 421K | |
| pptx | about 246K | snapshot said to be about 285 days old |
| webapp-testing | about 194K | same snapshot |
| mcp-builder | about 135K | same snapshot |
| whole anthropics/skills repo | about 3.7M across "21 skills" | |

frontend-design is the repo's most-installed skill by a wide margin.

### Cited Findings
- The skills.sh skill page for frontend-design reportedly "shows about 1.1M installs". — [skills.sh/anthropics/skills/frontend-design](https://www.skills.sh/anthropics/skills/frontend-design), via search snippet, crawl date unknown
- Third-party mirrors give different frontend-design figures:

  | Mirror | Installs | Date |
  |---|---|---|
  | Skillselion | 1,056,051 all-time | "as of October 31, 2026" |
  | another Skillselion page | 759,942 | |
  | uichemy | 954.8K | |

  — [Skillselion](https://skillselion.com/skills/anthropics/skills/frontend-design) (host blocked, from search summary); [uichemy](https://uichemy.com/design-skills/frontend-design/)
- skill-creator figures from skills.sh snippets:
  - leaderboard: "about 421.5K installs, behind frontend-design at 1.1M"
  - skill page: about 421.3K
  - publisher page: about 420.6K, with "3.7M total installs across its 21 skills"

  A separate `anthropics/claude-plugins-official` copy of skill-creator shows about 6.4K installs on skills.sh. — [skills.sh leaderboard](https://www.skills.sh/), [skills.sh/anthropics/skills/skill-creator](https://www.skills.sh/anthropics/skills/skill-creator), [skills.sh/anthropics/claude-plugins-official/skill-creator](https://www.skills.sh/anthropics/claude-plugins-official/skill-creator), all via search snippets
- claudemarketplaces.com reports about 412.9K installs for skill-creator. — [claudemarketplaces](https://claudemarketplaces.com/skills/anthropics/skills/skill-creator), via search snippet
- From the anthropics/skills publisher page: pptx 246.2K, webapp-testing 194.2K, mcp-builder 135.1K, and "21 skills 3.7M total installs". The search tool said "the page snapshot is about 285 days old", which would date it to roughly January 2026, so treat it as stale. — [skills.sh/anthropics/skills](https://www.skills.sh/anthropics/skills), via search snippet
- skills-hub.ai shows tiny counts (pptx 86, docx 36, webapp-testing 24, xlsx 16, pdf 8). These are probably that site's own installs, not skills.sh. — [skills-hub.ai/sources/anthropic](https://skills-hub.ai/sources/anthropic), via search snippet
- The README embeds a skills.sh badge, `https://skills.sh/b/anthropics/skills`. — [README](https://github.com/anthropics/skills/blob/main/README.md)

### Inferences
- These are rough relative rankings, not absolute values, given the stale snapshot.
  - frontend-design is first, with about 1.1M.
  - skill-creator is second, with about 420K.
  - pptx, webapp-testing and mcp-builder follow, in the 135K–250K range in an older snapshot. They are probably higher now.
- The "21 skills" figure on skills.sh does not match the 19 skill folders in the repo today. skills.sh may count `template/` and the pre-rename `claude-academy-guide`. That is unconfirmed.
- frontend-design's skills.sh count (~1.1M) and its Claude Code plugin count (1,134,112 on claude.com) are close, but they are separate channels and should not be added together.

### Gaps
- **Counts not found at all:** docx, pdf, xlsx, canvas-design, algorithmic-art, theme-factory, brand-guidelines, web-artifacts-builder, internal-comms, doc-coauthoring, slack-gif-creator, claude-api, academy-guide, discernment-nudge.
- **Global leaderboard rank** is unknown for every skill. The snippet said only that skill-creator sits "behind frontend-design".
- To verify, the user needs to allow `skills.sh` in the session's network settings, or check it from a local browser.

## 3. Official Claude Code plugins: which bundle skills, which are most installed, and how plugin installs differ from plain skills

### Takeaway
The `claude-plugins-official` marketplace lists **315 plugins**. Anthropic builds **39 of them in `/plugins`**; I counted 40 Anthropic-authored entries including `mcp-apps`.

About 15 Anthropic plugins bundle real SKILL.md skills. The rest are commands, agents, hooks or LSP servers.

Installs on claude.com, 2026-11-02:

| Plugin | Installs |
|---|---|
| frontend-design | 1,134,112 |
| code-review | 438,525 |
| code-simplifier | 346,763 |
| claude-md-management | 287,247 |
| feature-dev | 256,017 |
| security-guidance | 241,800 |
| ralph-loop | 196,527 |
| claude-code-setup | 195,067 |
| commit-commands | 171,244 |
| pr-review-toolkit | 114,856 |
| playground | 64,198 |

Plugins are installed per user, project or local scope and are namespaced `/plugin:skill`. **Cloud sessions don't load plugins that a repo's `.claude/settings.json` enables**, so for this cloud-based project, a plain skill copied into `.claude/skills/` is the only way to make a skill available in every session.

### Cited Findings

**Marketplace structure**
- The marketplace name is `claude-plugins-official`. It has 315 entries:
  - 39 local `./plugins/*` (Anthropic-internal)
  - 14 local `./external_plugins/*`
  - 163 `url`
  - 99 `git-subdir`

  The commonest categories are development (123), productivity (69) and database (39). — [.claude-plugin/marketplace.json](https://github.com/anthropics/claude-plugins-official/blob/main/.claude-plugin/marketplace.json)
- README: "`/plugins` – Internal plugins developed and maintained by Anthropic", "`/external_plugins` – Third-party plugins". Install with `/plugin install {plugin-name}@claude-plugins-official`. "Make sure you trust a plugin before installing… Anthropic does not control what MCP servers, files, or other software are included in plugins". Skill-bundle entries using `strict: false` register each skill "as `<plugin-name>:<skill-name>`". — [README](https://github.com/anthropics/claude-plugins-official/blob/main/README.md)
- The anthropics/claude-code repo's `plugins/` is now a legacy listing: "Anthropic's plugins are developed in claude-plugins-official. The `claude-code-plugins` marketplace in this repository still lists them, and installs them from there. The `claude-opus-4-5-migration` plugin has been retired." — [anthropics/claude-code plugins/README.md](https://github.com/anthropics/claude-code/blob/main/plugins/README.md)

**What each Anthropic plugin contains**
From each `plugins/<name>/` folder (skills/, commands/, agents/, hooks/) and plugin.json. — [plugins/ tree](https://github.com/anthropics/claude-plugins-official/tree/main/plugins)

*Bundle SKILL.md skills:*

| Plugin | Version | Skills | Other components |
|---|---|---|---|
| `frontend-design` | 1.1.1 | frontend-design | |
| `skill-creator` | | skill-creator | |
| `claude-code-setup` | 1.0.0 | claude-automation-recommender | Skill is "read-only… does NOT create or modify any files"; recommends hooks, subagents, skills, plugins and MCP servers. |
| `claude-md-management` | 1.0.0 | claude-md-improver | command `/revise-claude-md` |
| `playground` | | playground | Builds "self-contained single-file explorers" with controls, live preview and a copyable prompt. |
| `plugin-dev` | 0.1.1 | 7: plugin-settings, mcp-integration, command-development, agent-development, plugin-structure, hook-development, skill-development | command create-plugin; agents agent-creator, plugin-validator, skill-reviewer |
| `hookify` | 0.1.1 | writing-rules | commands configure, help, hookify, list; agent conversation-analyzer; hooks |
| `mcp-server-dev` | | build-mcp-server, build-mcpb, build-mcp-app | |
| `claude-security` | 0.12.0 | claude-security | 9 agents, hooks |
| `math-olympiad` | | math-olympiad | |
| `math-proof` | | siege, solo | 3 agents |
| `project-artifact` | | project-artifact | |
| `receipts` | | receipts | |
| `session-report` | | session-report | |
| `cwc-makers` | | cardputer-buddy, m5-onboard | |

*No SKILL.md skills:*

| Plugin | Version | Components |
|---|---|---|
| `code-review` | 1.0.1 | command code-review |
| `feature-dev` | 1.0.1 | command feature-dev; agents code-architect, code-explorer, code-reviewer |
| `pr-review-toolkit` | 1.0.1 | command review-pr; 6 agents: code-reviewer, code-simplifier, comment-analyzer, pr-test-analyzer, silent-failure-hunter, type-design-analyzer |
| `commit-commands` | 1.0.1 | commands commit, commit-push-pr, clean_gone |
| `code-simplifier` | 1.0.0 | agent |
| `ralph-loop` | 1.0.1 | commands, hooks |
| `security-guidance` | 2.0.17 | hooks only (plugin.json author "David Dworken") |
| `explanatory-output-style`, `learning-output-style` | | hooks |
| `code-modernization` | 1.0.0 | 13 commands, 8 agents, hooks |
| `agent-sdk-dev` | | command, 2 agents |
| `mcp-tunnels` | | command |
| 12 LSP plugins | | clangd, csharp, gopls, jdtls, kotlin, lua, php, pyright, ruby, rust-analyzer, swift, typescript |

**Install counts from claude.com, fetched 2026-11-02**
All of these are badged "Anthropic verified":
- frontend-design 1,134,112 — [claude.com/plugins/frontend-design](https://claude.com/plugins/frontend-design)
- code-review 438,525 — [claude.com/plugins/code-review](https://claude.com/plugins/code-review)
- code-simplifier 346,763 — [claude.com/plugins/code-simplifier](https://claude.com/plugins/code-simplifier)
- claude-md-management 287,247 — [claude.com/plugins/claude-md-management](https://claude.com/plugins/claude-md-management)
- feature-dev 256,017 — [claude.com/plugins/feature-dev](https://claude.com/plugins/feature-dev)
- security-guidance 241,800 — [claude.com/plugins/security-guidance](https://claude.com/plugins/security-guidance)
- ralph-loop 196,527 — [claude.com/plugins/ralph-loop](https://claude.com/plugins/ralph-loop)
- claude-code-setup 195,067 — [claude.com/plugins/claude-code-setup](https://claude.com/plugins/claude-code-setup)
- commit-commands 171,244 — [claude.com/plugins/commit-commands](https://claude.com/plugins/commit-commands)
- pr-review-toolkit 114,856 — [claude.com/plugins/pr-review-toolkit](https://claude.com/plugins/pr-review-toolkit)
- playground 64,198 — [claude.com/plugins/playground](https://claude.com/plugins/playground)
- skill-creator: "The page does not list an install count". — [claude.com/plugins/skill-creator](https://claude.com/plugins/skill-creator)

**The claude.com directory listing**
- It shows "24 of 528 plugins", with no counts, in this order:
  1. frontend-design
  2. Superpowers
  3. code-review
  4. context7
  5. code-simplifier
  6. playwright
  7. github
  8. claude-md-management
  9. feature-dev
  10. Security Guidance
  11. vercel
  12. typescript-lsp
  13. ralph-loop
  14. claude-code-setup
  15. commit-commands
  16. Figma
  17. supabase
  18. pr-review-toolkit
  19. pyright-lsp
  20. Chrome DevTools
  21. telegram
  22. Atlassian MCP
  23. slack
  24. serena

  — [claude.com/plugins](https://claude.com/plugins)
- The claude.com description for frontend-design ("bold aesthetic choices… high-impact animations… scroll-triggered motion") is older than the current SKILL.md, which now says to use motion "sparingly". — [claude.com/plugins/frontend-design](https://claude.com/plugins/frontend-design) vs [SKILL.md](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md)

**How plugins install, per Anthropic docs**
- `/plugin install commit-commands@claude-plugins-official` opens a details pane showing "Will install" components, "Last updated", and "Context cost" ("Every turn" and "When invoked" token estimates). — [Install and manage plugins](https://code.claude.com/docs/en/discover-plugins)
- There are three scopes:
  - user: `enabledPlugins` in `~/.claude/settings.json`
  - project: `.claude/settings.json`, committed. It "doesn't download it to their machines, so each collaborator also runs `claude plugin install <name>@<marketplace> --scope project` once".
  - local: `.claude/settings.local.json`

  — [same page](https://code.claude.com/docs/en/discover-plugins)
- "Claude Code adds Anthropic's official marketplace for you the first time you start an interactive terminal session". Shell install: `claude plugin install <name>@claude-plugins-official`. Auto-update is "On by default" for `claude-plugins-official`. — [same page](https://code.claude.com/docs/en/discover-plugins)
- **Cloud sessions:** "A cloud session… has no plugin browser and doesn't load the plugins you installed on your own machine or the ones your repository's `.claude/settings.json` turns on." Org plugins arrive through managed settings or claude.ai sync (`<name>@synced`). — [same page](https://code.claude.com/docs/en/discover-plugins)
- Plugin skills live at `<plugin>/skills/<name>/SKILL.md`, are "Invoked as `/plugin-name:skill-name`", "don't conflict, since they're namespaced", and "ignore `skillOverrides`". — [Skills docs](https://code.claude.com/docs/en/skills)

### Inferences
- **The directory looks sorted by installs.** Every count I measured falls in the same order as the claude.com listing: frontend-design > code-review > code-simplifier > claude-md-management > feature-dev > security-guidance > ralph-loop > claude-code-setup > commit-commands > pr-review-toolkit. Under that reading, third-party Superpowers sits between frontend-design and code-review (over 438K), and context7, playwright and github sit between code-review and claude-md-management.
- **Plugin vs plain skill, in practice:**
  - A plain skill is a folder in `.claude/skills/` with a bare `/name`. It is committed to git and loads everywhere, including cloud sessions. Here it is tracked in `skills-lock.json` by the `npx skills` CLI.
  - A plugin bundles skills with commands, agents, hooks and MCP/LSP servers. It is namespaced and auto-updated from its marketplace. It is enabled per scope, needs a per-machine install, and does not load in cloud sessions from repo settings.
  - Because this project runs as Claude Code on the web (`CLAUDE_CODE_REMOTE=true` in CLAUDE.md), plain project skills are the practical route.
- **Overlap with the project and with Claude Code's own built-ins:**
  - `code-review` and `code-simplifier` duplicate Claude Code's bundled `/code-review` and `/simplify` (see question 4).
  - `frontend-design` duplicates Taste and Impeccable.
  - The third-party `playwright` plugin duplicates the existing Playwright MCP.
- **Non-overlapping and plausibly useful here:**
  - `claude-md-management`: this project has a large CLAUDE.md.
  - `claude-code-setup`: a read-only recommender.
  - `playground`: interactive single-file HTML explorers, which suits design token and type exploration.
  - `skill-creator`: evals for the project's own skills.
  - `hookify` and `plugin-dev`: only if the team builds hooks or plugins.
  - `security-guidance`: hooks only, a light safety net.

### Gaps
- No install counts were collected for: typescript-lsp, pyright-lsp, hookify, plugin-dev, agent-sdk-dev, mcp-server-dev, claude-security, code-modernization, session-report, project-artifact, receipts, the output-style plugins, or skill-creator (no count shown).
- No counts exist for the `anthropic-agent-skills` marketplace plugins (`document-skills`, `example-skills`). claude.com doesn't list them, and I found no source.
- claude.com shows 528 plugins while marketplace.json has 315 entries. The directory probably also includes claude.ai/Cowork plugins or other marketplaces, but I couldn't confirm this.
- I didn't check whether the `/plugins` folders hold skills Anthropic marks as "always-on" vs "on-demand", or their context-cost estimates.

## 4. What Anthropic says about skill best practices, and which skills it highlights

### Takeaway
Anthropic's guidance:
- Keep SKILL.md concise (under 500 lines).
- Write a specific third-person `description` that says what the skill does *and* when to use it.
- Use progressive disclosure, with references one level deep.
- Build evaluations first and test across models.
- Bundle deterministic scripts.
- Install only from trusted sources.

The PDF skill is its canonical example. Claude Code itself bundles `/code-review`, `/simplify`, `/claude-api`, `/loop`, `/run` and others, which overlap with several plugins.

### Cited Findings

**Engineering blog** — "Equipping agents for the real world with Agent Skills", 2025-10-16, by Barry Zhang, Keith Lazuka and Mahesh Murag. — [anthropic.com engineering](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- Skills are "organized folders of instructions, scripts, and resources that agents can discover and load dynamically".
- There are three levels of progressive disclosure:
  1. metadata, loaded at startup
  2. the SKILL.md body, loaded when relevant
  3. linked files such as the PDF skill's `reference.md` and `forms.md`

  This is "the core design principle that makes Agent Skills flexible and scalable".
- The highlighted example is the PDF skill. Its form-field script runs without loading the script or the PDF into context.
- Advice: start with evaluation, structure for scale, think from Claude's perspective (especially `name` and `description`), and iterate with Claude. On security: "We recommend installing skills only from trusted sources", and audit scripts, dependencies and network calls.

**Authoring best-practices doc** — [platform.claude.com best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- "The context window is a public good"; "Default assumption: Claude is already very smart".
- Match the degree of freedom (high, medium or low) to how fragile the task is.
- Frontmatter limits:
  - `name`: up to 64 characters, lowercase letters, digits and hyphens, and no reserved words `anthropic` or `claude`.
  - `description`: up to 1,024 characters, no XML.
- Gerund names are preferred (`processing-pdfs`).
- "Always write in third person."
- "Keep the SKILL.md body under 500 lines."
- "Keep references one level deep from SKILL.md." Put a table of contents in any reference file over 100 lines.
- Avoid time-sensitive information. Use consistent terminology.
- "Create evaluations BEFORE writing extensive documentation"; "Build three scenarios"; develop with "Claude A" writing the skill and "Claude B" testing it.
- Scripts should "Solve, don't defer", avoid "voodoo constants", and use fully qualified MCP tool names in the form `ServerName:tool_name`.
- The checklist includes "At least three evaluations created" and "Tested with Haiku, Sonnet, and Opus".

**Claude Code skills doc** — [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills)
- Locations and precedence: enterprise > personal (`~/.claude/skills/`) > project (`.claude/skills/`). Nested `<subdir>/.claude/skills`, `--add-dir` and plugins are also supported. claude.ai account skills sync into `~/.claude/skills/synced/`.
- Claude Code frontmatter fields: `name`, `description`, `when_to_use`, `argument-hint`, `arguments`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `disallowed-tools`, `model`, `effort`, `context: fork`, `agent`, `background`, `hooks`, `paths`, `shell`.
- `description` plus `when_to_use` is "truncated at 1,536 characters".
- After compaction, each invoked skill keeps its "first 5,000 tokens", within a "25,000-token" combined budget.
- `.claude/commands/x.md` and `.claude/skills/x/SKILL.md` both create `/x`.
- **Bundled skills** shipped with Claude Code: `/doctor`, `/code-review` (alias `/review`), `/batch`, `/debug`, `/loop`, `/claude-api`, `/verify`, `/run`, `/run-skill-generator`, `/simplify`, and `/workflow-authoring` (when dynamic workflows are on). Also mentioned: `/skill-doctor`, `/init`, `/security-review`. All can be turned off with `disableBundledSkills`.
- Recommendations:
  - Set `disable-model-invocation: true` for side-effect workflows.
  - Review `allowed-tools` in skills shipped with a repo.
  - Use `skillOverrides` (`"on"`, `"name-only"`, `"user-invocable-only"`, `"off"`) to change a skill's visibility without editing it.
  - Test with a baseline comparison using `skill-creator` or `claude plugin eval`.

**Repo README**
- It links the support articles "What are skills?", "Using skills in Claude" and "How to create custom skills", plus the Skills API quickstart.
- Notion is its only highlighted "Partner Skills" entry.
— [README](https://github.com/anthropics/skills/blob/main/README.md)

### Inferences
- Anthropic's own repo departs from its 500-line guidance in places: `claude-api`'s SKILL.md is 616 lines (measured in the clone).
- The skills Anthropic itself promotes most are:
  - the document skills (PDF in the engineering post, and docx/pdf/pptx/xlsx as the production skills behind Claude's file creation);
  - `skill-creator`, which the Claude Code docs recommend for evals;
  - `frontend-design`, the top directory listing.
- For this project, `skillOverrides` is the documented way to keep an installed skill such as `frontend-design` from auto-triggering against Taste, without editing it.

### Gaps
- I did not fetch the support.claude.com articles or the Skills API guide. Their contents are not covered here beyond the README links.
- The code.claude.com skills page was read only up to character 100,000 of about 118,800. The truncated end, covering evaluation and sharing details, was not read.

## 5. GitHub stars and last-commit dates

### Takeaway
On 2 November 2026:

| Repo | Stars | Forks | Last push |
|---|---|---|---|
| anthropics/skills | 186,563 | 22,036 | 2026-10-28 |
| anthropics/claude-plugins-official | 45,766 | 4,765 | 2026-11-02 |
| anthropics/claude-code | 154,233 | | 2026-11-02 |

All three are actively maintained.

### Cited Findings
- **anthropics/skills:**
  - stargazers 186,563; forks 22,036; pushed_at 2026-10-28T19:20:39Z; license null; description "Public repository for Agent Skills". — `gh api search/repositories q=repo:anthropics/skills`, 2026-11-02 ([repo](https://github.com/anthropics/skills))
  - HEAD commit ca45fc4, 2026-10-28: "Update mcp-builder skill: teach v2 of the MCP TypeScript SDK (#2087)". There are 61 commits in total, the earliest dated 2025-10-15. — [commits](https://github.com/anthropics/skills/commits/main)
- **anthropics/claude-plugins-official:**
  - stargazers 45,766; forks 4,765; pushed_at 2026-11-02T07:29:13Z; license Apache-2.0; "Official, Anthropic-managed directory of high quality Claude Code Plugins." — gh search API, 2026-11-02 ([repo](https://github.com/anthropics/claude-plugins-official))
  - HEAD of main when cloned: 2026-10-30, "bump(runway-api): fe79eab0 → 6e98d3f3 (#6954)". — [commits](https://github.com/anthropics/claude-plugins-official/commits/main)
- **anthropics/claude-code:** stargazers 154,233; forks 25,526; pushed_at 2026-11-02T07:12:58Z. — gh search API, 2026-11-02 ([repo](https://github.com/anthropics/claude-code))

### Inferences
- The claude-plugins-official `pushed_at` (2026-11-02) is later than the main HEAD commit (2026-10-30). The later push is probably to another branch, but that is not verified.
- The recent activity in anthropics/skills is concentrated in a few skills: mcp-builder (Oct 28), claude-api (Oct 9), frontend-design (Sep 3), and the docx/pptx/xlsx update (Jul 16). Most of the creative and example skills haven't changed in substance since April 2026; the April change was a license-notice commit.

### Gaps
- Per-folder commit dates for claude-plugins-official plugins weren't available. The shallow clone shows every folder at 2026-10-30, and the GitHub REST commits endpoint returned 403 in this session.
