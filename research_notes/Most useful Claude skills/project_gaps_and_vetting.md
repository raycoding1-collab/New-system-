# Capability gaps in the New-system design-team setup, and how to vet third-party Agent Skills (as of 2026-11-02)

Scope and method notes for the report writer:
- Local facts come from the repo at /home/user/New-system- (CLAUDE.md, README.md, `.claude/skills/*`, `skills-lock.json`), read on 2026-11-02.
- Candidate skills were checked against their GitHub source. I made blobless clones of each repo's default-branch HEAD (no files run, nothing installed) and read the SKILL.md frontmatter and file lists. Commit SHAs are in the links.
- GitHub stars, last push and license come from `gh api search/repositories`, run 2026-11-02.
- **skills.sh could not be reached from this session.** curl got a 403 and WebFetch got ENOTFOUND. vercel.com, snyk.io, labs.zenity.io and owasp.org were also unreachable. Every install count below therefore comes from third-party directories or search snippets. They are **unverified** and often disagree. skills.sh links are built from the documented pattern `https://skills.sh/<owner>/<repo>/<skill>` and were not opened.
- Several security findings come from secondary coverage, because the primary blogs could not be fetched. Each one is marked.

## 1. Gap analysis: which pipeline stages are not covered, and which vetted skills fill them

### Takeaway
The setup is strong on art direction, visual critique, motion and browser click-through. Its clearest gaps are **SEO/metadata/structured data** (no coverage at all), **deployment**, **measured performance/accessibility audits** (Impeccable covers these only as heuristics), **persuasive marketing copy**, and **process discipline** (systematic debugging, verification before claiming done). The best-sourced fillers come from `addyosmani/web-quality-skills` (MIT, instruction-only, Lighthouse/WCAG 2.2), `coreyhaines31/marketingskills` (MIT, SEO/schema/copy) and `obra/superpowers` (MIT, debugging/verification). Browser testing, design tokens and skill authoring are already covered or duplicated, so adding skills there is low value.

### Cited Findings

**What is installed (baseline)**
- The project has 20 skill folders: `design-taste-frontend`, `impeccable`, 16 Emil Kowalski skills, `find-skills` and the `build-website` command-skill. Figma MCP and Playwright MCP are configured in `.mcp.json`. The demo `site/` is static HTML/CSS/JS. — [README.md](/home/user/New-system-/README.md), [CLAUDE.md](/home/user/New-system-/CLAUDE.md), `ls /home/user/New-system-/.claude/skills/`
- Pinned upstream versions: Emil `emilkowalski/skills@a81dbca` (MIT), Impeccable 4.8.0 `pbakaus/impeccable@df3a4ab` (Apache-2.0), Taste 2.1.5 `Leonxlnx/taste-skill@12af471` (MIT), Find Skills `vercel-labs/skills@92a9a34` (MIT), Playwright MCP `@playwright/mcp@0.0.83`. — [README.md](/home/user/New-system-/README.md)
- Impeccable's description claims "UX review, hierarchy, layout, typography, color, motion, UX copy, accessibility, responsive behavior, edge cases, and capturing or documenting design systems (DESIGN.md, tokens)". It has reference files for `audit`, `optimize`, `harden`, `clarify`, `document`, `extract` and others. — `/home/user/New-system-/.claude/skills/impeccable/SKILL.md`, `.../impeccable/reference/`
- Impeccable `audit` is a heuristic code audit that scores 5 dimensions 0–4. The accessibility dimension covers contrast 4.5:1, ARIA, keyboard, semantics, alt text, forms and touch targets (WCAG 2.5.8 24×24). Score 3 means "WCAG AA mostly met". It documents issues and does not fix them. — `/home/user/New-system-/.claude/skills/impeccable/reference/audit.md`
- Impeccable `optimize` tells the agent to measure "Core Web Vitals: LCP, INP, CLS" and names "Chrome DevTools (Lighthouse, Performance panel)" and "Compare Lighthouse scores", but it bundles no Lighthouse runner. `harden` mentions "Accessibility tests (axe, WAVE)" only in passing. — `/home/user/New-system-/.claude/skills/impeccable/reference/optimize.md` (lines ~221, 250), `.../harden.md` (line 333)
- Taste has a "5. Write the words" step (headline length rules based on gallery medians) and a real-browser gate (`inspect.mjs`, `lint.mjs`). — `/home/user/New-system-/.claude/skills/design-taste-frontend/SKILL.md` (lines ~201–207, 388–404)
- A grep of all installed skills for `SEO`, `og:image`, `Open Graph`, `JSON-LD`, `structured data`, `meta description`, `sitemap` and `robots.txt` found **no SEO or metadata guidance**. The only hits were incidental: a photo alt text containing "lighthouse" and Taste's "footer is … not a sitemap". `pick-ui-library` only mentions Satori for dynamic OG images. — local grep over `/home/user/New-system-/.claude/skills/`
- No installed skill covers deployment or git/PR workflow. `find-skills` lists "deployment" only as an example search domain. — local grep, `/home/user/New-system-/.claude/skills/find-skills/SKILL.md`
- This cloud session also exposes Claude Code built-in skills (`code-review`, `security-review`, `simplify`, `run`) and the user's synced claude.ai skills, including `anthropic-skills:skill-creator`. These are session/user-level and not part of the repo. — session skill listing (local observation, 2026-11-02)

**Candidate skills per gap**

GitHub data was retrieved 2026-11-02 with `gh api search/repositories`. Install counts are unverified third-party figures, as noted.

| Gap | Candidate (`owner/repo` → skill name) | Evidence and contents | Repo stars / last push / license | Install count (unverified) | Overlap with installed |
|---|---|---|---|---|---|
| SEO, metadata, structured data | `addyosmani/web-quality-skills` → `seo` ([GitHub](https://github.com/addyosmani/web-quality-skills/tree/afa8da9/skills/seo), [skills.sh](https://skills.sh/addyosmani/web-quality-skills/seo)) | SKILL.md 14.0 KB plus `references/STRUCTURED-DATA.md`. Triggers on "fix meta tags", "add structured data", "sitemap optimization". No scripts. Frontmatter `license: MIT` | 3,026★, pushed 2026-08-24, MIT, author Addy Osmani (individual GitHub account). The repo describes itself as "(unofficial)" Lighthouse/CWV-based skills ([repo, via search snippet](https://github.com/addyosmani/web-quality-skills)) | not found | None. SEO is a true gap |
| SEO (marketing-side) | `coreyhaines31/marketingskills` → `seo-audit` and `schema` ([GitHub](https://github.com/coreyhaines31/marketingskills/tree/88c79f6/skills), [skills.sh seo-audit](https://skills.sh/coreyhaines31/marketingskills/seo-audit), [skills.sh schema](https://skills.sh/coreyhaines31/marketingskills/schema)) | `seo-audit` 18.2 KB with references on title tags, local SEO and international SEO, plus `evals/evals.json`. `schema` 7.1 KB covers JSON-LD and rich snippets. No scripts. The repo has ~55 skills, including `ai-seo` and `site-architecture` | 57,945★, pushed 2026-10-31, MIT, author Corey Haines (individual) | seo-audit ~105.8K per a skills.sh page snippet; 189K–198K per [Skillselion](https://skillselion.com/best/skills-for-marketing-seo) / [Cody](https://meet-cody-website-xr0tt.kinsta.page/skills/seo-audit/). Snippet via [search](https://www.skills.sh/coreyhaines31/marketingskills) | None |
| Accessibility (WCAG) | `addyosmani/web-quality-skills` → `accessibility` ([GitHub](https://github.com/addyosmani/web-quality-skills/tree/afa8da9/skills/accessibility), [skills.sh](https://skills.sh/addyosmani/web-quality-skills/accessibility)) | "Audit and improve web accessibility following WCAG 2.2". 14.4 KB plus `references/WCAG.md` and `A11Y-PATTERNS.md`. No scripts | as above | ~39.9K ([Skillselion](https://skillselion.com/design/accessibility)); ~63.8K ([Enterprise DNA](https://enterprisedna.co/directories/skills/accessibility)) | **Partial overlap** with Impeccable `audit` a11y dimension. Adds WCAG 2.2 depth and fixes. The description triggers ("a11y audit", "WCAG compliance") collide with Impeccable |
| Accessibility / UI rules (alt.) | `vercel-labs/agent-skills` → `web-design-guidelines` ([GitHub](https://github.com/vercel-labs/agent-skills/tree/1a2c79d/skills/web-design-guidelines), [skills.sh](https://skills.sh/vercel-labs/agent-skills/web-design-guidelines)) | A 1.2 KB SKILL.md whose only job is to **fetch rules at runtime** from `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md` "before each review" | 33,388★, pushed 2026-10-28, org account. Repo license field is null; README says MIT | not found | **Heavy overlap**: triggers on "review my UI", "check accessibility", "audit design", "review UX", which are Impeccable's job under CLAUDE.md |
| Core Web Vitals / Lighthouse | `addyosmani/web-quality-skills` → `core-web-vitals`, `performance`, `web-quality-audit` ([GitHub](https://github.com/addyosmani/web-quality-skills/tree/afa8da9/skills)) | `core-web-vitals` has LCP/INP/CLS reference files. `web-quality-audit` targets "Lighthouse 13+", uses Chrome DevTools MCP `lighthouse_audit` or the Lighthouse CLI, and bundles `scripts/analyze.sh`. That script is a static grep smoke test (it greps `http://` URLs in source). I found no curl or wget in it | as above | not found | Overlaps Impeccable `optimize` (which names CWV but has no runner) and Emil `animation-performance` (frame budget only) |
| CWV (alt.) | `cloudflare/skills` → `web-perf` ([GitHub](https://github.com/cloudflare/skills/tree/1a33048/skills/web-perf), [skills.sh](https://skills.sh/cloudflare/skills/web-perf)) | "Audit, diagnose, or optimize website loading and interaction performance, Core Web Vitals, and Lighthouse performance scores". 8.4 KB | 3,251★, pushed 2026-10-31, Apache-2.0, Cloudflare org | not found | Same overlap as above |
| Marketing copy / CRO | `coreyhaines31/marketingskills` → `copywriting`, `copy-editing`, `cro` ([GitHub](https://github.com/coreyhaines31/marketingskills/tree/88c79f6/skills/copywriting), [skills.sh](https://skills.sh/coreyhaines31/marketingskills/copywriting)) | `copywriting` 15.6 KB with references `ai-tells.md`, `copy-frameworks.md`, plus evals. `cro` covers landing pages and forms. No scripts | as above | copywriting ~95.2K per skills.sh snippet; ~180K per Skillselion ([search summary](https://skillselion.com/best/skills-for-marketing-seo)) | Overlaps Taste "5. Write the words" and Impeccable `clarify` (UX microcopy). Persuasive and conversion copy is not covered. Taste must stay lead (CLAUDE.md) |
| Web app testing | `anthropics/skills` → `webapp-testing` ([GitHub](https://github.com/anthropics/skills/tree/ca45fc4/skills/webapp-testing), [skills.sh](https://skills.sh/anthropics/skills/webapp-testing)) | Python Playwright toolkit. `scripts/with_server.py` launches servers with `subprocess.Popen(..., shell=True)`. Apache License (LICENSE.txt) | 186,563★, pushed 2026-10-28, Anthropic org | 93.5K–179.5K across directories ([vibeindex](https://vibeindex.ai/skills/anthropics/skills/webapp-testing), [llmbase](https://llmbase.ai/skills/anthropics/webapp-testing/), [mdskills](https://www.mdskills.ai/skills/webapp-testing)) | **Duplicates** Playwright MCP + Taste `inspect.mjs`, which CLAUDE.md already assigns to verification. Adds a Python dependency |
| Web app testing (alt.) | `microsoft/playwright-cli` → `playwright-cli` ([GitHub](https://github.com/microsoft/playwright-cli/tree/c2d8d19/skills/playwright-cli), [skills.sh](https://skills.sh/microsoft/playwright-cli/playwright-cli)) | 15.7 KB plus references on tracing, video, test generation and request mocking. Frontmatter **pre-grants** `allowed-tools: Bash(playwright-cli:*) Bash(npx playwright:*)` | 14,870★, pushed 2026-11-01, Apache-2.0, Microsoft org | not found | Duplicates Playwright MCP. Useful only if moving to a CLI and real test files |
| React / Next.js code | `vercel-labs/agent-skills` → `vercel-react-best-practices` (folder `react-best-practices`) ([GitHub](https://github.com/vercel-labs/agent-skills/tree/1a2c79d/skills/react-best-practices), [skills.sh](https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices)) | 7.3 KB plus a large `rules/` folder, `license: MIT`. The same repo also has `composition-patterns`, `react-view-transitions`, `deploy-to-vercel`, `vercel-optimize`, `writing-guidelines` | 33,388★ | ~185K on one undated mirror ([search summary](https://llmbase.ai/skills)). The installed find-skills says "100K+ installs each" (`find-skills/SKILL.md` line 48) | None, but the demo stack is static HTML. Relevant only if `/build-website` targets React/Next |
| Design systems / tokens | — (none recommended) | Impeccable `document`/`extract` produce DESIGN.md and tokens. Figma MCP `get_variable_defs` reads Figma variables (CLAUDE.md). `anthropics/skills` `theme-factory` gives 10 preset themes for artifacts, and `brand-guidelines` applies **Anthropic's** brand ([GitHub](https://github.com/anthropics/skills/tree/ca45fc4/skills)) | — | — | Already covered. The Anthropic theme skills would fight Taste's direction draw |
| Image generation / optimisation | `coreyhaines31/marketingskills` → `image` ([GitHub](https://github.com/coreyhaines31/marketingskills/tree/88c79f6/skills/image)) | AI image generation and prompting for marketing assets | as above | not found | Conflicts with Taste's real-photo/draw policy and CLAUDE.md's ban on stand-ins presented as found photos. Optimisation (lazy loading, formats) is partly in Impeccable `audit` and addyosmani `performance` |
| Deployment | `vercel-labs/agent-skills` → `deploy-to-vercel` ([GitHub](https://github.com/vercel-labs/agent-skills/tree/1a2c79d/skills/deploy-to-vercel), [skills.sh](https://skills.sh/vercel-labs/agent-skills/deploy-to-vercel)) | 9.7 KB, no scripts. Runs `npx vercel@latest deploy [path] --temporary -y` (claimable deploy without login) and says "Do not curl or fetch the deployed URL to verify it works" | 33,388★ | not found | None. A real gap. Note that `@latest` is unpinned, and the "don't verify" line conflicts with the project's verify-everything rule |
| Deployment (alt.) | `cloudflare/skills` → `wrangler` / `cloudflare` ([GitHub](https://github.com/cloudflare/skills/tree/1a33048/skills)) | Official Cloudflare skills for Workers/Pages and wrangler | 3,251★, Apache-2.0 | not found | None |
| Systematic debugging | `obra/superpowers` → `systematic-debugging` ([GitHub](https://github.com/obra/superpowers/tree/2ce8aa1/skills/systematic-debugging), [skills.sh](https://skills.sh/obra/superpowers/systematic-debugging)) | "Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes". 9.5 KB plus `find-polluter.sh` and a `.ts` example | 310,913★, pushed 2026-10-29, MIT, author Jesse Vincent (individual) | ~204K ([vibeindex](https://vibeindex.ai/skills/obra/superpowers/systematic-debugging)), undated | None |
| Verification before "done" | `obra/superpowers` → `verification-before-completion` ([GitHub](https://github.com/obra/superpowers/tree/2ce8aa1/skills/verification-before-completion), [skills.sh](https://skills.sh/obra/superpowers/verification-before-completion)) | 3.6 KB, instruction-only: "requires running verification commands and confirming output before making any success claims" | as above | ~106K ([vibeindex](https://vibeindex.ai/skills/obra/superpowers/verification-before-completion)), undated | Complements Taste's gate and the CLAUDE.md verification rule. Low collision |
| Git / PR workflow | `obra/superpowers` → `finishing-a-development-branch`, `requesting-code-review` ([GitHub](https://github.com/obra/superpowers/tree/2ce8aa1/skills)) | 7.8 KB, instruction-only | as above | not found | Partly covered by Claude Code built-ins `code-review`, `security-review`, `simplify` (session listing) |
| Skill authoring | `anthropics/skills` → `skill-creator` ([GitHub](https://github.com/anthropics/skills/tree/ca45fc4/skills/skill-creator), [skills.sh](https://skills.sh/anthropics/skills/skill-creator)) | 33 KB plus Python eval scripts (`run_eval.py`, `improve_description.py`, `package_skill.py`…), Apache License. Claude Code docs describe its benchmark, blind A/B and **description tuning** (should-trigger/should-not-trigger prompts) — [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills) | 186,563★ | ~309K (July 2026 snapshot per [Skillselion guide](https://skillselion.com/guides/anthropic-skills-official-guide)) | Already available to this user via synced `anthropic-skills:skill-creator`. Alternative: `obra/superpowers` `writing-skills` |

- Reference install figures from the same aggregators: `anthropics/skills` `frontend-design` 649,620 (skills.sh, July 2026 snapshot), with later figures of 716K and 843,617. `vercel-labs/skills` `find-skills` is listed at 2,438,642. — [Skillselion guide](https://skillselion.com/guides/anthropic-skills-official-guide), [Skillselion frontend-design](https://skillselion.com/best/skills-for-frontend-design) (all unverified against skills.sh)
- `anthropics/skills` README: "These skills are provided for demonstration and educational purposes only … Always test skills thoroughly in your own environment." It says many skills are Apache 2.0, while the docx/pdf/pptx/xlsx skills are "source-available, not open source". — [anthropics/skills README @ca45fc4](https://github.com/anthropics/skills/blob/ca45fc4/README.md)
- `vercel-labs/agent-skills` `writing-guidelines` uses the same runtime-fetch pattern as `web-design-guidelines` (it fetches `vercel-labs/writing-guidelines/main/command.md`). — [GitHub @1a2c79d](https://github.com/vercel-labs/agent-skills/tree/1a2c79d/skills/writing-guidelines)
- For comparison, the installed upstreams' current stars (2026-11-02): Taste 108,232, Impeccable 99,921, Emil 52,864, vercel-labs/skills 37,717. — `gh api search/repositories` (GitHub)

### Inferences
- **Highest-value additions** for a marketing-site pipeline, ranked:
  1. `addyosmani/web-quality-skills` `seo`. This fills the only stage with zero coverage, adds no scripts, and is MIT.
  2. `obra/superpowers` `verification-before-completion`. It is tiny and instruction-only, and it reinforces "check its own work".
  3. One measured performance/a11y auditor: addyosmani `web-quality-audit` or `core-web-vitals`. Have Impeccable call it during the `audit` step instead of running it as a parallel owner.
  4. A deploy skill only if the user wants hosting. Prefer `deploy-to-vercel` or Cloudflare `wrangler`, and pin the CLI version.
- **Skip or defer:**
  - `webapp-testing` and `playwright-cli` duplicate Playwright MCP.
  - `web-design-guidelines` collides with Impeccable and its rules are mutable at runtime.
  - Anthropic's `theme-factory`/`brand-guidelines` and `frontend-design` would compete with Taste's art direction.
  - Marketing `image` conflicts with Taste's photo policy.
  - `vercel-react-best-practices` matters only if the stack moves to React.
- If copywriting is added (`coreyhaines31` `copywriting`), CLAUDE.md should state that Taste's "words" step leads and the copy skill only edits within it. Otherwise two skills will own headlines.
- Picking several skills from one repo (addyosmani's 6, coreyhaines31's ~55) is a vetting advantage: one author and one license review. Install only the named skills, not `--skill '*'`.

### Gaps
- Current skills.sh install counts and audit verdicts (Gen Agent Trust Hub / Socket / Snyk) for every candidate could not be verified. skills.sh is blocked in this session (403/ENOTFOUND). The figures above are third-party and inconsistent. For example, one skills.sh repo-page snippet showed "1.5K total installs" for anthropics/skills, which contradicts its per-skill numbers.
- I found no install count for `web-design-guidelines`, `deploy-to-vercel`, `web-perf`, `playwright-cli`, `core-web-vitals` or `schema`.
- `vercel-labs/next-skills` (985★) showed no SKILL.md in my tree listing, so its skill names could not be confirmed.
- I did not read the full bodies of the candidate skills for quality. Only frontmatter, sizes, file lists and the fetch/script lines were checked.

## 2. Security: reported malicious or risky skills, skills.sh audits, and Anthropic's advice

### Takeaway
Through 2026, multiple independent studies found malicious skills in public registries. Reported tactics include prompt injection combined with malware, fake "prerequisite" installers, typosquats, and trojanizing a clean skill after it has gathered installs. A campaign on **skills.sh itself** passed 1.7M aggregate installs in July–August 2026. skills.sh and the `skills` CLI do show third-party audits (Gen Agent Trust Hub, Socket, Snyk), but these are advisory only, and Trail of Bits showed that the scanners can be bypassed. Anthropic's position is to use skills only from trusted sources and to audit every bundled file.

### Cited Findings

**Anthropic guidance**
- "Use Skills only from trusted sources: those you created yourself or obtained from Anthropic … a malicious Skill can direct Claude to call tools or run code in ways that don't match the Skill's stated purpose." — [Claude Platform docs: Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- The same page lists these points:
  - "Audit thoroughly: Review all files bundled in the Skill: SKILL.md, scripts, images, and other resources. Look for … unexpected network calls, file access patterns."
  - "Skills that fetch data from external URLs pose particular risk … Even trustworthy Skills can be compromised if their external dependencies change over time."
  - Tool misuse, data exposure, and "Treat like installing software".
  - In Claude Code, skills have "Full network access … the same network access as any other program on the user's computer". — [Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- Claude Enterprise can turn on "Skill content scanning" for skills uploaded in claude.ai/Cowork. It "doesn't cover Skills uploaded through the Skills API or the Claude Console" and is not described for Claude Code project skills. — [Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- Anthropic engineering post (Oct 16, 2025): "We recommend installing skills only from trusted sources. When installing a skill from a less-trusted source, thoroughly audit it before use … paying particular attention to code dependencies and bundled resources like images or scripts", including instructions that "connect to potentially untrusted external network sources". — [Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- Claude Code docs on `allowed-tools`: "Workspace trust doesn't gate this field. Claude Code applies a project skill's `allowed-tools` even in a `-p` run in a folder you've never trusted. A skill can grant itself broad tool access, so review the `allowed-tools` of skills checked into a repository." The `disableSkillShellExecution: true` setting disables `` !`command` `` injection in skills. — [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills)

**Incidents and studies (2026)**
- **Zenity Labs, skills.sh campaign (Aug 2026, Black Hat), via secondary coverage:**
  - A credential-stealing campaign was distributed through skills.sh. The skills first appeared as **clean copies of legitimate upstream skills** to build installs and credibility, then were trojanized on July 11, using typosquatted look-alike names.
  - The payload was a remote loader that delivered a second-stage credential harvester. One family reached >1.7M aggregate installs by Aug 2. These are counters, not unique users.
  - It targeted Paperclip and Browser Use users. Zenity and Vercel disrupted it, and Zenity found "dozens" of other malicious skills.
  - Sources: [TechRadar](https://techradar.com/pro/security/experts-warn-malicious-ai-skills-are-hitting-more-victims-than-ever-with-one-family-amassing-1-7-million-downloads), [BusinessWire](https://www.businesswire.com/news/home/20260806707467/en/), [VMblog](https://vmblog.com/news/zenity-labs-uncovers-1-7-million-install-malicious-skills-campaign-and-dozens-of-malicious-ai-agent-skills/). Primary [Zenity post](https://labs.zenity.io/post/attackers-target-agents-via-the-skill-supply-chain) was not fetchable.
- **Snyk "ToxicSkills" (Feb 2026), via secondary coverage:**
  - It audited 3,984 skills (ClawHub, plus skills.sh per some sources). 36.82% had at least one security flaw, 13.4% had critical issues, and 76 contained confirmed malicious payloads.
  - 91% of the malicious ones combined malware patterns with prompt injection, with obfuscated credential-harvesting one-liners. 8 were still live at publication.
  - Sources disagree on what "1,467" counts (flawed skills vs payloads). Sources: [Forkast](https://forkast.news/ai-agent-skills-are-the-new-supply-chain-attack-vector-and-most-have-never-been-vetted), [Plushcap summary of Snyk blog](https://www.plushcap.com/content/snyk/blog/snyk-snyk-finds-prompt-injection-in-36-1467-malicious-payloads-in-a-toxicskills-study-of-agent-skills-supply-chain-compromise). Primary [Snyk blog](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/) was not fetchable.
- **Koi Security "ClawHavoc" (Jan–Feb 2026):**
  - Of 2,857 ClawHub skills, 341 were malicious, 335 of them from one campaign. They used fake prerequisites to install Atomic Stealer (AMOS) on macOS and a keylogging trojan on Windows.
  - A later update raised the count to 824 malicious out of 10,700+ skills.
  - Typosquats of the CLI included `clawhubb` and `cllawhub`. The only publisher gate was a GitHub account at least one week old. Koi released the Clawdex scanner.
  - Sources: [The Hacker News](https://thehackernews.com/2026/02/researchers-find-341-malicious-clawhub.html), [Koi blog](https://koi.ai/blog/clawhavoc-341-malicious-clawedbot-skills-found-by-the-bot-they-were-targeting)
- **Academic study (arXiv 2601.10338, Jan 15, 2026):**
  - 26.1% of 31,132 skills had at least one vulnerability across 14 patterns.
  - By category: data exfiltration 13.3%, privilege escalation 11.8%, prompt injection only 0.7%.
  - Skills bundling scripts were 2.12× more likely to be vulnerable (p<0.001), and 5.2% showed high-severity patterns suggesting malicious intent. — [arXiv:2601.10338](https://www.arxiv.org/abs/2601.10338) (figures via search summary)
- **Trail of Bits (June 3, 2026), via secondary coverage:**
  - It bypassed the ClawHub, Cisco skill-scanner and skills.sh detectors. In three of four cases the bypass took under an hour to build.
  - Techniques: about 100,000 newlines of padding to trigger scanner truncation; a payload in compiled Python bytecode (`.pyc`); indirect execution, where the skill fetches its logic from a document with a hidden script; and prompt injection against LLM-based scanners.
  - Conclusion: "Don't outsource trust to a scanner."
  - Sources: [VPNCentral](https://vpncentral.com/?p=251452), [The Hacker News](https://thehackernews.com/2026/06/fake-ai-agent-skill-passed-security.html), [CSA research note](https://labs.cloudsecurityalliance.org/wp-content/uploads/2026/06/CSA_research_note_AI_agent_skill_scanner_bypass_20260610-csa-styled.pdf)
- A separate test (AIR, reported by The Hacker News) scanned a clean package that linked to an external setup page, then swapped that page for a malicious script after the scan. AIR sells a marketplace, so treat its scale claims with caution. — [The Hacker News](https://thehackernews.com/2026/06/fake-ai-agent-skill-passed-security.html)
- Adversa.ai reported that rephrasing a known injection phrase (e.g., "set aside the earlier guidance") evaded Cisco's and other scanners. — [Adversa.ai](https://adversa.ai/blog/agent-skill-scanners-bypass-eight-tested) (via search summary)
- Cisco's open-source `cisco-ai-defense/skill-scanner` (pip `cisco-ai-skill-scanner`) is "a best-effort security scanner for AI Agent Skills that detects prompt injection, data exfiltration, and malicious code patterns". The repo has 2,682★, was pushed 2026-10-26, and its license field is NOASSERTION. — [PyPI](https://pypi.org/project/cisco-ai-skill-scanner/), [GitHub](https://github.com/cisco-ai-defense/skill-scanner), gh search
- OWASP has started an "Agentic Skills Top 10" with AST01 "Malicious Skills". The page could not be fetched. — [OWASP AST01](https://owasp.org/www-project-agentic-skills-top-10/ast01.html)

**Does skills.sh show security audits?**
- Yes. skills.sh has per-skill audit pages at `/<owner>/<repo>/<skill>/security/<provider>` from three providers: **Gen Agent Trust Hub** (`agent-trust-hub`), **Socket** and **Snyk**. Each shows a risk level (Safe/Low/Med/High/Critical, or Socket's Pass/Warn with alert counts) and an analysis date.
- Audits flag patterns such as running a CLI through `npx` (fetching code at runtime) and installers that download and run remote scripts (rated CRITICAL). — [skills.sh audit page examples](https://skills.sh/vercel/vercel-plugin/vercel-firewall/security/agent-trust-hub), [Socket example](https://skills.sh/openhands/skills/vercel/security/socket), [Snyk example](https://skills.sh/tychohq/agent-skills/vercel/security/snyk) (via search snippets)
- Snyk's partnership post describes a skills.sh "Security Leaderboard" and a "Security Verified" badge. This is vendor framing. — [Snyk × Vercel](https://snyk.io/blog/snyk-vercel-securing-agent-skill-ecosystem) (via search summary)
- What the `skills` CLI source does with audits (`vercel-labs/skills@92a9a34`, the version installed here):
  - `npx skills add` fetches audits from `https://www.skills.sh/tele/audit` and prints a "Security Risk Assessments" table with ATH, Socket and Snyk columns.
  - The code comment reads "Wrapped in try/catch so a failed audit fetch never blocks installation … security info is advisory only".
  - The "Proceed with installation?" confirmation is skipped when `-y` is passed.
  - `DISABLE_TELEMETRY=1`/`DO_NOT_TRACK=1` disables audit requests. Audits are requested only for confirmed-public GitHub repos.
  - Sources: [src/add.ts](https://github.com/vercel-labs/skills/blob/92a9a34/src/add.ts) (lines ~122–200, 2393–2416), [src/telemetry.ts](https://github.com/vercel-labs/skills/blob/92a9a34/src/telemetry.ts), [README](https://github.com/vercel-labs/skills/blob/92a9a34/README.md), [docs/troubleshooting.md](https://github.com/vercel-labs/skills/blob/92a9a34/docs/troubleshooting.md)
- Vercel's "State of Agent Skills" report says skills.sh reached about 1M skills and about 280M installs in about seven months. Install figures "use aggregate registry counters. They do not represent unique people or necessarily independent choices." 375 skills (0.04%) account for 62% of installs (secondhand). — [Vercel blog](https://vercel.com/blog/state-of-agent-skills) (via search summary; vercel.com unreachable), [Groundy](https://groundy.com/articles/skills-sh-crossed-1-million-agent-skills-what-teams-actually-install/)

### Inferences
- **Install counts can be gamed.** The Zenity campaign built installs on clean copies and then swapped in the payload, and Vercel says the counters are not unique users. The installed `find-skills` rule ("Prefer skills with 1K+ installs") is therefore a weak signal on its own.
- **This project's install command** (`npx skills add … --copy -y`, per CLAUDE.md) skips the CLI's confirmation prompt. In cloud sessions, where skills.sh is blocked, the audit table silently does not appear. Before approving, someone must read the skills.sh audit tabs from a machine that can reach them, or read the files.
- **Remote-instruction skills** such as `web-design-guidelines`, `writing-guidelines` and `deploy-to-vercel`'s `npx vercel@latest` are the exact pattern Anthropic's docs warn about ("external dependencies change over time"). This holds even though they come from a reputable org: the files on disk can stay byte-identical while the behaviour changes.
- Scanners and badges are a first filter, not a verdict. Trail of Bits, Adversa and AIR all show this.

### Gaps
- Primary texts of the Snyk, Zenity, Trail of Bits, Koi and OWASP posts could not be fetched (hosts blocked). Figures come from secondary coverage or search summaries and should be spot-checked.
- I found no direct Vercel statement on what changed in skills.sh after the Zenity campaign (publisher verification, takedown process).
- I could not confirm whether skills.sh shows a visible "verified publisher" or official-org badge separate from the security audits.

## 3. Vetting checklist, and how `--copy` plus `skills-lock.json` help

### Takeaway
Vet in this order: who published it, what is in the folder, what it can do, and what can change after install. Install counts and stars are only tie-breakers. In this project, `--copy` puts the full skill files in git, and `skills-lock.json`'s `computedHash` (SHA-256 over every file path and its contents) detects any later change on disk. Neither pins the commit, and neither protects against instructions or packages a skill fetches at runtime.

### Cited Findings
- `computedHash` is "SHA-256 hash computed from all files in the skill folder". `computeSkillFolderHash` reads all files recursively, sorts them by relative path, and hashes each path plus its contents ("Include the path in the hash so renames are detected"). — [vercel-labs/skills src/local-lock.ts @92a9a34](https://github.com/vercel-labs/skills/blob/92a9a34/src/local-lock.ts) (lines 37–41, 190–208)
- A lock entry can hold `source`, `sourceUrl`, optional `ref` ("Branch or tag ref used for installation"), `sourceType`, `skillPath`, `computedHash` and `installMode: 'copy'`. Nothing records a commit SHA. — [src/local-lock.ts](https://github.com/vercel-labs/skills/blob/92a9a34/src/local-lock.ts) (lines 15–50)
- This project's `skills-lock.json` has 18 entries, each with `source`, `sourceType`, `skillPath` and `computedHash`, and **no `ref`**. Impeccable is not in the lock, because it was copied manually. Commit SHAs are recorded only in README.md. — [/home/user/New-system-/skills-lock.json](/home/user/New-system-/skills-lock.json), [README.md](/home/user/New-system-/README.md)
- `--frozen-lockfile` (the default when `CI`/`GITHUB_ACTIONS` is set) makes `experimental_install`/`experimental_sync` fail when "every restored skill must match the content hash recorded in skills-lock.json". A mismatching source is skipped with exit code 1. `--copy` means "Copy files instead of symlinking to agent directories". — [docs/commands.md @92a9a34](https://github.com/vercel-labs/skills/blob/92a9a34/docs/commands.md) (lines ~72, 342–379)
- The installed `find-skills` vetting steps are: install count ("Prefer skills with 1K+ installs. Be cautious with anything under 100"), source reputation ("Official sources (vercel-labs, anthropics, microsoft)"), and GitHub stars ("<100 stars … skepticism"). It does not ask the agent to read files, check scripts or network calls, or check audit tabs. — `/home/user/New-system-/.claude/skills/find-skills/SKILL.md` (lines 64–72)
- Anthropic's audit criteria: review all bundled files; look for unexpected network calls, file access, or operations that don't match the stated purpose; and treat external URL fetches and changing dependencies as risky. — [Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- Skills that bundle executable scripts are 2.12× more likely to be vulnerable. — [arXiv:2601.10338](https://www.arxiv.org/abs/2601.10338)
- Scanner-evasion techniques to look for manually: huge whitespace padding, `.pyc` or other binary/archive files, and instructions to fetch logic from external documents. — [VPNCentral on Trail of Bits](https://vpncentral.com/?p=251452), [The Hacker News](https://thehackernews.com/2026/06/fake-ai-agent-skill-passed-security.html)
- Typosquats and look-alike names were used on both ClawHub (`clawhubb`, `cllawhub`) and skills.sh (Zenity). — [The Hacker News](https://thehackernews.com/2026/02/researchers-find-341-malicious-clawhub.html), [TechRadar](https://techradar.com/pro/security/experts-warn-malicious-ai-skills-are-hitting-more-victims-than-ever-with-one-family-amassing-1-7-million-downloads)
- `allowed-tools` in a project skill can self-grant tool access without workspace trust, and `disableSkillShellExecution` can block `` !`cmd` `` injection. — [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills). Example: `playwright-cli` pre-grants `Bash(playwright-cli:*) Bash(npx playwright:*)`. — [GitHub @c2d8d19](https://github.com/microsoft/playwright-cli/blob/c2d8d19/skills/playwright-cli/SKILL.md)

### Inferences
Suggested checklist for the report. It is synthesized from the sources above; the thresholds are judgement calls.

1. **Identity.**
   - Is the exact `owner/repo` the real publisher (org account such as `anthropics`, `vercel-labs`, `microsoft`, `cloudflare`, or a known individual)?
   - Compare the spelling character by character, because typosquats exist.
   - Prefer the canonical repo over forks and mirrors. skills.sh lists many re-hosted copies of popular skills under other owners (e.g., `openclaw/skills/anthropic-frontend-design`, `davila7/claude-code-templates/frontend-design`, per [search results](https://skills.sh/davila7/claude-code-templates/frontend-design)).
2. **Contents.**
   - List every file. Instruction-only (SKILL.md + `.md` references) is lowest risk.
   - For any `scripts/`, `.sh`, `.py`, `.js` or binaries (`.pyc`, archives, images), read them fully.
   - Grep for `curl`, `wget`, `fetch(`, `http`, `npx`, `pip install`, `subprocess`/`shell=True`, `eval`, `base64`, `~/.ssh`, `.env`, `token` and `KEY`.
   - Check for abnormal whitespace padding or a very large file size relative to its content.
3. **Capability claims.**
   - Check frontmatter `allowed-tools`, `hooks`, `` !`command` `` injection and `context: fork`.
   - Does the body tell Claude to fetch instructions from a URL (mutable remote rules), run `@latest` packages, or "install prerequisites"?
4. **Fit and collisions.**
   - Does the description overlap Taste, Impeccable or Emil triggers? If so, decide who leads in CLAUDE.md, or set `disable-model-invocation: true`.
5. **Signals (tie-breakers only).**
   - skills.sh audit tabs (ATH/Socket/Snyk) all Safe/Low, and read why any are not.
   - Installs in the thousands or more, but remember counters are gameable and not unique.
   - Repo stars and recent push; a license present (MIT/Apache-2.0); and no open security issues.
6. **Install hygiene for this repo.**
   - Install named skills only (`--skill <name>`, never `'*'` from big multi-skill repos) with `--copy`.
   - Review the resulting `git diff` of `.claude/skills/<name>/` and `skills-lock.json` in a PR before merging.
   - Record the upstream commit SHA in README, as the project already does.
   - On `npx skills update -p`, review the diff, because a changed `computedHash` is the signal to re-vet.
   - Consider running `--frozen-lockfile` in CI.
   - Optionally run `cisco-ai-skill-scanner` as an extra filter, not as the verdict.
- `--copy` + git + `computedHash` gives tamper-evidence and reviewable diffs for files on disk. It does **not** cover runtime fetches (`web-design-guidelines` pulls `main/command.md` each run) or `npx …@latest` calls. Those skills should be pinned (fork or vendor the fetched rules) or avoided.
- Because the lock has no `ref` and commits live only in README, a re-install could pull a newer default branch. The hash mismatch would reveal that, but only if someone checks it.

### Gaps
- I did not verify whether `npx skills add` accepts a commit-SHA ref (e.g., `owner/repo#<sha>`) for true commit pinning. The docs/commands.md source-format section was not read in full.
- I found no published, authoritative vetting checklist from Vercel/skills.sh. The checklist above is synthesized.

## 4. Cost of too many skills: context overhead and trigger collisions

### Takeaway
Each model-invocable skill keeps its name and description in context permanently. Anthropic's spec estimates about 100 tokens per skill. Claude Code caps the whole listing at **1% of the context window**, and on overflow it drops descriptions of the least-used skills, which breaks their triggering. This project already spends about 8.2K characters on 16 always-listed descriptions, before any user-level or built-in skills. New skills should be few, specific, and set to `disable-model-invocation` or `name-only` where possible. I found no official cap on the number of skills.

### Cited Findings
- Progressive disclosure, Level 1 metadata: "Always (at startup) | ~100 tokens per Skill". Level 2 SKILL.md body: "Under 5k tokens" when triggered. Level 3 resources: "None until accessed". Anthropic also says "you can install many Skills without context penalty: until a Skill is triggered, only its name and description occupy context." — [Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- Spec limits: `name` max 64 chars, `description` max 1,024 chars. — [Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- Claude Code listing behaviour, from [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills):
  - "if you have many skills, Claude Code drops some descriptions to fit the listing's character budget, which removes the keywords Claude needs to match your request. The budget scales at 1% of the model's context window. When the listing overflows, Claude Code drops descriptions starting with the skills you invoke least."
  - Each entry's description plus `when_to_use` "is capped at 1,536 characters".
  - Knobs: `skillListingBudgetFraction` (e.g., `0.02`), the `SLASH_COMMAND_TOOL_CHAR_BUDGET` env var, `skillOverrides` set to `"name-only"`, and `skillListingMaxDescChars`.
  - Diagnostics: `/doctor` (listing cost), `/skill-doctor` (unused skills), and `/context` Skills row (post-budget size since v2.1.196).
- `disable-model-invocation: true` means "Description not in context, full skill loads when invoked". `user-invocable: false` hides a skill from the `/` menu but keeps its description in context. For a skill that "triggers too often", the docs say to "Make the description more specific" or add `disable-model-invocation: true`. — [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills)
- Name precedence: enterprise > personal > project for same-named skills. Plugin skills are namespaced (`/plugin:skill`), so both copies load. — [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills)
- skill-creator's "Description tuning" generates should-trigger and should-not-trigger prompts and measures hit rate. — [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills)
- Measured in this repo (frontmatter `description` length, characters):
  - 20 skills total, 16 model-invocable, about **8,228 chars** of always-listed descriptions.
  - The 4 with `disable-model-invocation: true` (`build-website` 316, `pick-ui-library` 259, `prototype` 242, `review-animations` 159) are not listed.
  - Largest: `design-taste-frontend` 971, `animation-performance` 807, `mobile-native` 738, `remove-animations` 592, `impeccable` 591.
  - Off-pipeline for static websites but always listed: `write-swift` 482 and `animate-expo` 523.
  - Source: local measurement of `/home/user/New-system-/.claude/skills/*/SKILL.md`, 2026-11-02.
- Overlapping trigger phrases in the candidates:
  - `web-design-guidelines`: "review my UI", "check accessibility", "audit design", "review UX".
  - `accessibility`: "a11y audit", "WCAG compliance".
  - `best-practices`: "security audit", "code quality review".
  - `web-quality-audit`: "audit my site", "optimize my website".
  - `copy-editing`: "polish this", "make this better".
  - Installed `impeccable` claims "critique, audit, polish … accessibility … UX copy".
  - Sources: candidate SKILL.md frontmatter at the GitHub commits linked in section 1; `/home/user/New-system-/.claude/skills/impeccable/SKILL.md`

### Inferences
- The doc's "1% of context window" is stated as a character budget, but the unit conversion is not spelled out. At roughly 4 chars per token, 1% of a 200K-token window is about 2K tokens, or about 8K characters. That is close to what this repo's 16 descriptions already use. On a 1M-token window it is about 10K tokens. This is my estimate. Run `/doctor` and `/context` in a real session to confirm.
- The user's personal and synced skills plus Claude Code built-ins share the same listing. This session lists about 40 skills, so the project's descriptions already compete for budget. Each new skill raises the chance that a rarely used skill (e.g., `break-ui`, `apple-design`) loses its description and stops auto-triggering.
- Practical rules for the report:
  1. Add at most about 3–5 skills, each filling a distinct gap.
  2. Give process or reference skills (`seo`, deploy) `disable-model-invocation: true`, or invoke them from `/build-website` stages.
  3. Consider `skillOverrides: "name-only"` for `write-swift`/`animate-expo` in this web-only project.
  4. Avoid any skill whose description says "audit / review UI / polish", because Impeccable owns those words in CLAUDE.md.
  5. After adding skills, re-check `/doctor` and run skill-creator's should/should-not-trigger tests.
- "Many skills without context penalty" (platform docs) and Claude Code's description dropping on overflow are not contradictory. The penalty is small per skill but bounded by the listing budget, and the failure mode is silent mis-triggering, not an error.

### Gaps
- I found no Anthropic guidance giving a recommended maximum number of installed skills, and no published measurement of trigger-collision rates between overlapping skills.
- The exact unit of the 1% budget (characters vs tokens) and its current default fallback were not stated in the fetched text.
