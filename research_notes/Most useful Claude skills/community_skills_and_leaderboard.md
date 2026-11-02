# Community Claude / Agent Skills and the skills.sh Leaderboard (as of 2 November 2026)

**Method and access notes (read first).** skills.sh itself could not be reached from this session: WebFetch returned `ENOTFOUND skills.sh`, and curl gets a proxy 403. news.ycombinator.com, huggingface.co, vercel.com and mcp.directory were also blocked for WebFetch. Leaderboard numbers below therefore come from **LinklyAI/best-skills**, an open-data project that scrapes skills.sh's all-time, trending and hot lists (600 rows each) once a day. I used its **2026-11-02 snapshot**, pulled from raw.githubusercontent.com. These are third-party scraped copies of skills.sh numbers. They match the figures web-search snippets quote for the same dates, but I could not check them against skills.sh live. GitHub stars, last push and licence come from `gh api search/repositories` on 2026-11-02 unless marked otherwise. Where a finding comes only from a search-result summary because the page itself could not be fetched, it says "(search summary)".

## 1. What are the top skills on the skills.sh leaderboard (all-time and trending), with install counts and dates seen?

### Takeaway
On 2 Nov 2026 the all-time board is led by Vercel's `find-skills` (4.16M installs). Next come Matt Pocock's `mattpocock/skills` (21 of the top 70 rows), HeyGen's `hyperframes` video skills, Vercel's `agent-browser`, Anthropic's `frontend-design`, and a block of 22 Lark/Feishu skills. Raw install counts are badly distorted, though. skills.sh counts installs per bundle, so every skill in a repo gets an install whenever the repo is installed. Several top-30 entries also come from repos with fewer than 30 GitHub stars that look like promotional clones.

### Cited Findings

**How the counts work (affects every number below)**
- skills.sh install counts are "deduplicated installs reported by the skills CLI's anonymous telemetry. Manual `git clone` installs are not counted. Installs are **bundle-level**: installing a repo counts once for every skill in it." — [LinklyAI best-skills methodology](https://github.com/LinklyAI/best-skills/blob/main/docs/methodology.md)
- Known limitations: "skills.sh telemetry only counts CLI installs and can be disabled by users; CI installs may inflate some counts… all skills of a popular multi-skill repo rank high together — the current lists do not fold same-repo skills." — [methodology](https://github.com/LinklyAI/best-skills/blob/main/docs/methodology.md)
- The snapshot's all-time list goes 600 deep. Rank 600 has 62,728 installs, so any skill missing from it has fewer installs than that (or isn't on skills.sh). — [skills-sh.csv, 2026-11-02](https://raw.githubusercontent.com/LinklyAI/best-skills/main/data/2026-11-02/raw/skills-sh.csv)
- Plugin-marketplace installs (`/plugin install …`) are not skills.sh CLI installs. Superpowers and Matt Pocock's skills both point users to Claude Code plugin marketplaces first. — [obra/superpowers README](https://github.com/obra/superpowers), [mattpocock/skills README](https://github.com/mattpocock/skills)

**All-time top 50 (skills.sh, snapshot 2026-11-02).** "Installs, latest week" is the last of skills.sh's 8 weekly buckets. Stars and push date come from the same day's `github-repos.csv`. "ANOMALY" marks repos with fewer than 100 GitHub stars but around 1M installs. The skills.sh URL pattern is `https://skills.sh/<owner>/<repo>/<skill>`. Source: [skills-sh.csv](https://raw.githubusercontent.com/LinklyAI/best-skills/main/data/2026-11-02/raw/skills-sh.csv), [github-repos.csv](https://raw.githubusercontent.com/LinklyAI/best-skills/main/data/2026-11-02/raw/github-repos.csv)

| # | Skill | owner/repo | All-time installs | Installs, latest week | Repo stars (pushed) | Type / flag |
|---|---|---|---|---|---|---|
| 1 | find-skills | vercel-labs/skills | 4,157,364 | 121,665 | 37,622 (2026-10-30) | vendor |
| 2 | grill-me | mattpocock/skills | 1,476,610 | 48,664 | 309,245 (2026-11-01) | community |
| 3 | hyperframes-cli | heygen-com/hyperframes | 1,371,474 | 144,957 | 77,112 (2026-11-02) | vendor |
| 4 | hyperframes | heygen-com/hyperframes | 1,333,260 | 156,397 | 77,112 (2026-11-02) | vendor |
| 5 | agent-browser | vercel-labs/agent-browser | 1,332,513 | 78,806 | 45,140 (2026-11-01) | vendor |
| 6 | grill-with-docs | mattpocock/skills | 1,264,692 | 41,171 | 309,245 (2026-11-01) | community |
| 7 | media-use | heygen-com/hyperframes | 1,242,836 | 150,801 | 77,112 (2026-11-02) | vendor |
| 8 | improve-codebase-architecture | mattpocock/skills | 1,208,903 | 38,894 | 309,245 (2026-11-01) | community |
| 9 | reddit-automation | flowkit-labs/skills | 1,201,771 | 103,833 | 26 (2026-08-12) | community — ANOMALY: <100 stars |
| 10 | tdd | mattpocock/skills | 1,182,780 | 39,153 | 309,245 (2026-11-01) | community |
| 11 | design-mobile-apps | designed-by-ai/skills | 1,168,898 | 136,799 | 23 (2026-10-06) | community — ANOMALY: <100 stars |
| 12 | hyperframes-registry | heygen-com/hyperframes | 1,130,102 | 111,877 | 77,112 (2026-11-02) | vendor |
| 13 | setup-matt-pocock-skills | mattpocock/skills | 1,094,220 | 35,702 | 309,245 (2026-11-01) | community |
| 14 | handoff | mattpocock/skills | 1,080,972 | 39,160 | 309,245 (2026-11-01) | community |
| 15 | frontend-design | anthropics/skills | 1,062,579 | 29,060 | 186,364 (2026-10-28) | vendor |
| 16 | grilling | mattpocock/skills | 1,033,871 | 47,202 | 309,245 (2026-11-01) | community |
| 17 | triage | mattpocock/skills | 1,025,908 | 33,488 | 309,245 (2026-11-01) | community |
| 18 | prototype | mattpocock/skills | 1,025,261 | 34,602 | 309,245 (2026-11-01) | community |
| 19 | hyperframes-animation | heygen-com/hyperframes | 1,005,082 | 64,260 | 77,112 (2026-11-02) | vendor |
| 20 | hyperframes-core | heygen-com/hyperframes | 930,767 | 55,617 | 77,112 (2026-11-02) | vendor |
| 21 | ai-video-generation | 101-skills/superpowers | 929,009 | 67,605 | 17 (2026-08-31) | community — ANOMALY: <100 stars |
| 22 | ai-image-generation | 101-skills/superpowers | 927,613 | 67,369 | 17 (2026-08-31) | community — ANOMALY: <100 stars |
| 23 | twitter-automation | 101-skills/superpowers | 927,214 | 67,281 | 17 (2026-08-31) | community — ANOMALY: <100 stars |
| 24 | ai-avatar-video | 101-skills/superpowers | 926,953 | 67,288 | 17 (2026-08-31) | community — ANOMALY: <100 stars |
| 25 | domain-modeling | mattpocock/skills | 919,836 | 39,443 | 309,245 (2026-11-01) | community |
| 26 | hyperframes-creative | heygen-com/hyperframes | 916,818 | 58,088 | 77,112 (2026-11-02) | vendor |
| 27 | ui-taste | uizze.sh | 901,686 | 92,139 | n/a | community — domain source, no GitHub repo |
| 28 | teach | mattpocock/skills | 899,479 | 35,109 | 309,245 (2026-11-01) | community |
| 29 | codebase-design | mattpocock/skills | 895,457 | 37,697 | 309,245 (2026-11-01) | community |
| 30 | diagnosing-bugs | mattpocock/skills | 876,433 | 37,477 | 309,245 (2026-11-01) | community |
| 31 | vercel-react-best-practices | vercel-labs/agent-skills | 861,110 | 23,623 | 33,354 (2026-10-28) | vendor |
| 32 | lark-doc | open.feishu.cn | 840,795 | 25,631 | n/a | vendor — domain source, no GitHub repo |
| 33 | lark-base | open.feishu.cn | 840,115 | 25,533 | n/a | vendor — domain source, no GitHub repo |
| 34 | lark-drive | open.feishu.cn | 840,103 | 25,528 | n/a | vendor — domain source, no GitHub repo |
| 35 | lark-shared | open.feishu.cn | 839,889 | 25,586 | n/a | vendor — domain source, no GitHub repo |
| 36 | lark-im | open.feishu.cn | 839,139 | 25,463 | n/a | vendor — domain source, no GitHub repo |
| 37 | lark-calendar | open.feishu.cn | 838,741 | 25,438 | n/a | vendor — domain source, no GitHub repo |
| 38 | lark-sheets | open.feishu.cn | 838,650 | 25,466 | n/a | vendor — domain source, no GitHub repo |
| 39 | lark-approval | open.feishu.cn | 838,611 | 25,421 | n/a | vendor — domain source, no GitHub repo |
| 40 | lark-wiki | open.feishu.cn | 838,541 | 25,495 | n/a | vendor — domain source, no GitHub repo |
| 41 | lark-contact | open.feishu.cn | 837,767 | 25,390 | n/a | vendor — domain source, no GitHub repo |
| 42 | lark-task | open.feishu.cn | 837,664 | 25,451 | n/a | vendor — domain source, no GitHub repo |
| 43 | lark-slides | open.feishu.cn | 837,524 | 25,403 | n/a | vendor — domain source, no GitHub repo |
| 44 | lark-mail | open.feishu.cn | 837,481 | 25,389 | n/a | vendor — domain source, no GitHub repo |
| 45 | lark-whiteboard | open.feishu.cn | 837,321 | 25,380 | n/a | vendor — domain source, no GitHub repo |
| 46 | lark-event | open.feishu.cn | 837,233 | 25,379 | n/a | vendor — domain source, no GitHub repo |
| 47 | lark-openapi-explorer | open.feishu.cn | 836,993 | 25,368 | n/a | vendor — domain source, no GitHub repo |
| 48 | lark-attendance | open.feishu.cn | 836,890 | 25,351 | n/a | vendor — domain source, no GitHub repo |
| 49 | lark-skill-maker | open.feishu.cn | 836,520 | 25,355 | n/a | vendor — domain source, no GitHub repo |
| 50 | lark-workflow-meeting-summary | open.feishu.cn | 836,380 | 25,345 | n/a | vendor — domain source, no GitHub repo |

**Ranks 51–100 (all-time, same snapshot)** — [skills-sh.csv](https://raw.githubusercontent.com/LinklyAI/best-skills/main/data/2026-11-02/raw/skills-sh.csv)
- #51–53, #59, #62, #64, #70, #75: more `open.feishu.cn` Lark skills (lark-minutes, lark-okr, lark-markdown, lark-apps, lark-note…), about 620K–836K each.
- #54 `mattpocock/skills` code-review 834,148; #61 implement 812,439; #63 ask-matt 802,198; #65 wayfinder 758,034; #67 to-spec 753,358; #68 research 750,974; #69 to-tickets 749,990; #81 wizard 587,475.
- #55–58 `magentosh/superpowers` ai-image-generation / ai-video-generation / ai-avatar-video / twitter-automation, about 818K each (repo has 4 stars). #76–79 `qu-skills/superpowers`, the same four skills at about 611K (4 stars). #88–91 `skills-shell/superpowers`, the same four at about 574K (3 stars).
- #60 `vercel-labs/agent-skills` web-design-guidelines 812,640 (vendor).
- #66 `heygen-com/hyperframes` hyperframes-keyframes 754,500; #73 hyperframes-audio 663,570; #74 general-video 661,451 (vendor).
- #71 `remotion-dev/skills` remotion-best-practices 727,896 (vendor).
- **#72 `leonxlnx/taste-skill` design-taste-frontend 715,989.** Already in the user's project.
- #80 `juliusbrussee/caveman` caveman 604,417 (community; repo 116,828 stars, Apache-2.0).
- #82–93 `microsoft/azure-skills` (microsoft-foundry 585,685, azure-diagnostics 576,411, …), vendor.
- #104–110 `google/agents-cli` (about 532K each), vendor.

**Where the well-known community collections rank on the all-time board** — [skills-sh.csv](https://raw.githubusercontent.com/LinklyAI/best-skills/main/data/2026-11-02/raw/skills-sh.csv)
- `nextlevelbuilder/ui-ux-pro-max-skill` ui-ux-pro-max: #182, 428,860.
- `obra/superpowers` brainstorming: #193, 413,920. It has 14 skills in the top 600 (see section 2).
- `emilkowalski/skills` emil-design-eng: #196, 408,486. 14 skills in the top 600. Already installed.
- `pbakaus/impeccable` impeccable: #237, 378,685. Standalone polish/critique/audit/etc. sit at about 62K–85K. Already installed.
- `coreyhaines31/marketingskills`: 44 skills in the top 600; seo-audit #290 (243,674), copywriting #291 (242,599).
- `tt-a1i/archify` archify: #333, 186,328.
- `dietrichgebert/ponytail` ponytail: #394, 115,024.
- `wshobson/agents`: only 2 skills; typescript-advanced-types #452 (96,126), tailwind-design-system #559 (71,531).
- `kepano/obsidian-skills`: obsidian-markdown #456 (94,181) plus 4 more.
- `nutlope/hallmark` hallmark: #481, 84,481.
- `addyosmani/agent-skills`: 19 skills; code-review-and-quality #515 (78,320), security-and-hardening #529 (75,764).
- `jakubkrehel/make-interfaces-feel-better`: #536, 74,724.
- `squirrelscan/skills` audit-website: #537, 74,652.
- **Not in the all-time top 600 (fewer than 62,728 installs, or not listed):** trailofbits/skills, K-Dense-AI/scientific-agent-skills, alirezarezvani/claude-skills, softaworks/agent-toolkit, jezweb/claude-skills, blader/humanizer, OthmanAdi/planning-with-files, mvanhorn/last30days-skill, Jeffallan/claude-skills, sickn33/agentic-awesome-skills.

**Growth since mid-August (comparison with the 2026-08-16 snapshot)** — [skills-sh.csv 2026-08-16](https://raw.githubusercontent.com/LinklyAI/best-skills/main/data/2026-08-16/raw/skills-sh.csv) vs [2026-11-02](https://raw.githubusercontent.com/LinklyAI/best-skills/main/data/2026-11-02/raw/skills-sh.csv)
- find-skills: 2,966,935 → 4,157,364. grill-me: 866,562 (#2) → 1,476,610 (#2). frontend-design: 781,189 (#3) → 1,062,579 (#15). agent-browser: 680,941 (#7) → 1,332,513 (#5).
- obra/superpowers brainstorming: 326,623 (#139) → 413,920 (#193). ui-ux-pro-max: 317,074 (#142) → 428,860 (#182). coreyhaines seo-audit: 186,966 (#214) → 243,674 (#290).
- heygen-com/hyperframes was not in the 16 Aug top 25. By 2 Nov it held #3, #4, #7, #12, #19 and #20, at about 110K–156K installs a week.
- Earlier find-skills figures reported elsewhere: about 3.6M (a review "about a month ago"), 2.8M (an earlier guide), 2.0M (June 2026) (search summary) — [vibecoding.app review](https://vibecoding.app/blog/skills-sh-review), [o-mega.ai](https://o-mega.ai/articles/top-10-ai-agent-skills-for-2026-an-in-depth-guide)

**Trending view (skills.sh, 2026-11-02).** The `installs` column in this view is a short-window count. It appears to be about 24 hours, since find-skills shows 13,947 against 121,665 for the week. — [skills-sh.csv](https://raw.githubusercontent.com/LinklyAI/best-skills/main/data/2026-11-02/raw/skills-sh.csv)
- #1–4 `skills-shell/superpowers` ai-image-generation / ai-video-generation / ai-avatar-video / twitter-automation (about 29.4K each; repo has 3 stars).
- #5 `uizze.sh` ui-taste 26,771; #6 `uizze/uizze` uizze-ui 17,818; #7 `designed-by-ai/skills` design-mobile-apps 16,574.
- #8–13 `gencraft-labs/skills` (ai-video-generation, image-to-video, ai-image-generation, ai-music, video-edit), about 15.5K–15.8K each; repo has 0 stars. #11 `flowkit-labs/skills` reddit-automation 15,655.
- #14–18 `heygen-com/hyperframes` (media-use 14,770, hyperframes-cli 14,459, hyperframes-registry, hyperframes) and #16 find-skills 13,947.
- #19–30 are more four-skill "superpowers" clones (`101-skills`, `bankai-skills`, `its-a-skill-issue`), about 9.8K each.
- Week-over-week growth (LinklyAI trending-7d): the skills-shell clones +33.6%, ui-taste −13.9%, design-mobile-apps −2.5%, gencraft-labs about +7% — [LinklyAI README](https://github.com/LinklyAI/best-skills)

**Hot view (skills.sh, 2026-11-02; very small hourly-scale counts)** — [skills-sh.csv](https://raw.githubusercontent.com/LinklyAI/best-skills/main/data/2026-11-02/raw/skills-sh.csv)
- vercel-labs agent-desktop, vercel-react-view-transitions and vercel-cli-with-tokens lead. `coreyhaines31/marketingskills` holds 8 of the top 15 (ab-testing, sales-enablement, ads, ad-creative, emails, churn-prevention, revops, schema). Also present: anthropics mcp-builder, `tjboudreaux/cc-thinking-skills` (pre-mortem, red-team, opportunity-cost, theory-of-constraints) and `leonxlnx/taste-skill` brandkit.

**What the clones are**
- `101-skills/superpowers` README: "# inference.sh skills — AI agent skills for models via inference.sh CLI. Generate images, videos…" `magentosh/superpowers` and `its-a-skill-issue/superpowers` have the same inference.sh description. These are unrelated to obra/superpowers despite the name. — [101-skills/superpowers](https://github.com/101-skills/superpowers), [github-repos.csv](https://raw.githubusercontent.com/LinklyAI/best-skills/main/data/2026-11-02/raw/github-repos.csv)
- `flowkit-labs/skills` README: "# doany skills — Agent skills from doany.ai… `reddit-automation`: Find Reddit threads where people are actively shopping for what you sell, and draft replies that read like a helpful community member." The repo has 26 stars. — [flowkit-labs/skills](https://github.com/flowkit-labs/skills)
- `prime-skills/runcomfy-agent-skills` (30 skills, about 440K each) describes itself as "RunComfy AI media skills for Claude agents — incremental publish test" (61 stars). — [github-repos.csv](https://raw.githubusercontent.com/LinklyAI/best-skills/main/data/2026-11-02/raw/github-repos.csv)

**Third-party "worth installing" ranking (LinklyAI WIS, 2026-11-02).** This is a composite of popularity, momentum, buzz, maintenance and trust. Top 10: frontend-design (anthropics) 79.3; agent-browser 76.8; find-skills 76.5; **grill-me (mattpocock) 70.1**; self-improving-agent (ClawHub) 67.4; ai-image-generation (101-skills clone) 67.1; remotion-best-practices 66.9; vercel-react-best-practices 66.4; web-design-guidelines 66.1; ai-video-generation (clone) 63.8. Further down: skill-creator #11, grill-with-docs #12, handoff #28, tdd #29, design-taste-frontend #76. — [LinklyAI best-100.csv](https://raw.githubusercontent.com/LinklyAI/best-skills/main/data/2026-11-02/rankings/best-100.csv)

**Ecosystem scale**
- Vercel's "State of agent skills" (published 25 Sept 2026): skills.sh reached 1 million skills and nearly 280 million installs in about seven months after its January 2026 launch. 375 skills (about 0.04%) account for 62% of installs, and the top 1.2% account for 94%. Software engineering is the largest category by installs at 18% (search summary; Vercel page blocked) — [Vercel blog](https://vercel.com/blog/state-of-agent-skills), [superpowerdaily summary](https://superpowerdaily.com/posts/vercel-finds-agent-skill-installs-concentrated-in-a-tiny-share-of-its-registry)
- Top skills.sh verified publishers by total installs: microsoft 7.10M (582 skills), vercel-labs 3.19M, github 2.00M, anthropics 1.94M (605 skills), firebase 686K. — [LinklyAI README, Official Vendors](https://github.com/LinklyAI/best-skills)

### Inferences
- Bundle-level counting explains why mattpocock/skills has about 50 skills between 200K and 1.48M, and why all 22 Lark skills sit within 1% of each other (about 836K–841K). On skills.sh, a high rank shows that a repo is popular. It does not show that the individual skill is used.
- About a dozen entries in the top 100 (inference.sh "superpowers" clones, gencraft-labs, flowkit-labs, designed-by-ai, prime-skills) have 0–61 GitHub stars but 400K–1.2M installs. They also cluster at identical counts across repos. That pattern fits CI- or bot-driven installs, not real adoption. Treat them as unverified and don't recommend them. The clones' reuse of the "superpowers" name could mislead users looking for obra/superpowers.
- Ranked by real community adoption (stars plus installs), the leading community skill sources are mattpocock/skills, obra/superpowers, leonxlnx/taste-skill, juliusbrussee/caveman, nextlevelbuilder/ui-ux-pro-max-skill, emilkowalski/skills, pbakaus/impeccable and coreyhaines31/marketingskills.
- obra/superpowers ranks lower on skills.sh (#193) than its 310K stars would suggest. That is probably because most users install it through plugin marketplaces, which skills.sh telemetry doesn't count.

### Gaps
- No direct check against skills.sh. Its live pages and API were unreachable. Every leaderboard figure is LinklyAI's scrape (2026-11-02, about 01:00 UTC).
- skills.sh's own total-skill and total-install counters for November 2026 could not be read. The 1M skills / about 280M installs figure is from September 2026 and second-hand.
- No source was found that investigates or confirms whether the anomalous installs are gamed. The bot/CI explanation is an inference.

## 2. obra/superpowers (Jesse Vincent): skills, distribution, adoption, maintenance

### Takeaway
Superpowers is the most-starred community skills project on GitHub: 310,912 stars and 27,671 forks on 2 Nov 2026, MIT licence, last push 2026-10-29. It is a complete, opinionated development method: brainstorm → worktree → plan → subagent execution with TDD → review → finish. It ships mainly as a plugin, including through Anthropic's official marketplace (`/plugin install superpowers@claude-plugins-official`). Its 14 skills also appear on skills.sh at about 220K–414K installs each.

### Cited Findings
- Repo stats (gh search, 2026-11-02): obra/superpowers, 310,912 stars, 27,671 forks, created 2025-10-09, pushed 2026-10-29, MIT, described as "An agentic skills framework & software development methodology that works." — [GitHub](https://github.com/obra/superpowers)
- "Superpowers is a complete software development methodology for your coding agents, built on top of a set of composable skills and some initial instructions that make sure your agent uses them." Built by Jesse Vincent and Prime Radiant, which offers commercial support (sales@primeradiant.com). — [README](https://github.com/obra/superpowers)
- **Install routes, Claude Code:** official marketplace `/plugin install superpowers@claude-plugins-official`, or `/plugin marketplace add obra/superpowers-marketplace` then `/plugin install superpowers@superpowers-marketplace`. The README also covers Antigravity, Codex (official Codex plugin marketplace), Cursor, Devin CLI, Factory Droid, Gemini CLI (`gemini extensions install https://github.com/obra/superpowers`), GitHub Copilot CLI, Grok Build CLI (`grok plugin install superpowers@xai-official`), Kimi Code, OpenCode, Pi, Qwen Code, Hermes Agent and Muse. — [README](https://github.com/obra/superpowers)
- Anthropic's `claude-plugins-official` marketplace.json lists `superpowers` with source `https://github.com/obra/superpowers.git` (pinned sha). Description: "Superpowers teaches Claude brainstorming, subagent driven development with built in code r[eview]…" — [anthropics/claude-plugins-official marketplace.json](https://github.com/anthropics/claude-plugins-official/blob/main/.claude-plugin/marketplace.json)
- obra/superpowers-marketplace: 1,316 stars, pushed 2026-10-21, MIT. — [GitHub](https://github.com/obra/superpowers-marketplace)
- The README describes a session-start hook. For Muse it says "hooks require approval on first install. To verify… send `Let's make a react todo list` — a working install auto-triggers `brainstorming` before any code is written." — [README](https://github.com/obra/superpowers)
- **Workflow:** (1) brainstorming → (2) using-git-worktrees → (3) writing-plans ("bite-sized tasks (2-5 minutes each)… exact file paths, complete code, verification steps") → (4) subagent-driven-development or executing-plans → (5) test-driven-development ("Enforces RED-GREEN-REFACTOR… Deletes code written before tests") → (6) requesting-code-review ("Critical issues block progress") → (7) finishing-a-development-branch. "The agent checks for relevant skills before any task. Mandatory workflows, not suggestions." — [README](https://github.com/obra/superpowers)
- **Skills library in the README:** test-driven-development; systematic-debugging ("4-phase root cause process"); verification-before-completion; diagnosing-superpowers (new: reads a session transcript to work out what went wrong); brainstorming; writing-plans; executing-plans; dispatching-parallel-agents; requesting-code-review; receiving-code-review; using-git-worktrees; finishing-a-development-branch; subagent-driven-development ("two-stage review (spec compliance, then code quality)"); writing-skills; using-superpowers. — [README](https://github.com/obra/superpowers)
- **skills.sh installs (2026-11-02 snapshot):** brainstorming #193, 413,920; systematic-debugging #264, 316,373; writing-plans #269, 290,684; using-superpowers #270, 276,812; requesting-code-review #273, 269,131; test-driven-development #274, 266,920; verification-before-completion #277, 260,920; executing-plans #284, 250,310; subagent-driven-development #289, 244,830; receiving-code-review #301, 228,020; dispatching-parallel-agents #306, 224,609; writing-skills #307, 224,567; using-git-worktrees #309, 223,472; finishing-a-development-branch #311, 220,875. CLI form: `npx skills add obra/superpowers --skill <name>`. — [skills-sh.csv](https://raw.githubusercontent.com/LinklyAI/best-skills/main/data/2026-11-02/raw/skills-sh.csv)
- **Releases:** first announced 2025-10-09 ([blog.fsck.com](https://blog.fsck.com/2025/10/09/superpowers/)); Superpowers 5 on 2026-03-09, deprecating three slash commands ([blog](https://blog.fsck.com/2026/03/09/superpowers-5)); 5.0.x point releases through 2026-03-31, with v5.0.7 adding Copilot CLI; 5.1 on 2026-05-04, cleaning up Subagent Driven Development and Code Review ([blog](https://blog.fsck.com/2026/05/04/superpowers-5.1.md)); **Superpowers 6 on 2026-06-15**, adding Pi, Antigravity and Kimi Code and claiming builds "up to 50% faster and 60% cheaper" (author's claim, not independently verified) ([blog](https://blog.fsck.com/2026/06/15/Superpowers-6/)) (search summary for these posts). O'Reilly's September 2026 listing calls it version 6 (search summary) — [O'Reilly](https://www.oreilly.com/radar/superpowers-for-humans/)
- **Contribution policy:** "we don't generally accept contributions of new skills and… any updates to skills must work across all of the coding agents we support. We also don't accept agent-written PRs that fix issues filed by someone else unless a maintainer asked for one." — [README](https://github.com/obra/superpowers)
- **Telemetry disclosure:** "By default, the Prime Radiant logo on brainstorming's optional visual companion feature is loaded from our website. It includes the version of Superpowers in use. It does not include any details about your project, prompt, or coding agent." — [README](https://github.com/obra/superpowers)
- **Reputation:** Simon Willison called Jesse Vincent "one of the most creative users of coding agents (Claude Code in particular) that I know" and credited Vincent's post for the tip behind his own simonw/claude-skills repo (search summary of the Oct 2025 posts) — [Simon Willison, jesse-vincent tag](https://feeds.simonwillison.net/tags/jesse-vincent/)
- Listicles and reviews in 2026 consistently name Superpowers as the main workflow pack, crediting its plan-first approach, isolated worktrees, test-first development and two review passes. One guide warns that combining it with other planning-focused skills "can give Claude two competing processes for the same request" (search summary) — [Firecrawl](https://www.firecrawl.dev/blog/best-claude-code-skills), [designrevision](https://designrevision.com/blog/best-claude-code-skills), [buildthisnow](https://www.buildthisnow.com/blog/guide/mechanics/best-claude-code-skills-2026)

### Inferences
- The plugin is the intended install. It carries the bootstrap hook and `using-superpowers`, which make skills fire automatically. An `npx skills add obra/superpowers --skill …` install copies only SKILL.md folders, so auto-triggering is likely weaker.
- Superpowers and mattpocock/skills both own the "process" layer (planning, TDD, review). For the user's website project, pick one process pack. If Superpowers is chosen, its brainstorming and writing-plans steps would compete with Taste's fixed run order (brief, argument, draw…). The generic `systematic-debugging` and `verification-before-completion` skills overlap least with the existing design team.
- The project is clearly well maintained: pushed 4 days before the snapshot, a major version roughly every three months, and listed in Anthropic's and other vendors' official marketplaces.

### Gaps
- Plugin-marketplace install counts for Superpowers are not published. Its own README says "we have no idea how many of you are using Superpowers."
- No post after Superpowers 6 (June 2026) surfaced. The exact current version in November 2026 is unverified; `.version-bump.json` was not read.
- Willison's and Vincent's posts were seen only through search summaries, not fetched in full.

## 3. Other notable community collections: verified existence, adoption and maintenance

### Takeaway
All the named collections exist. K-Dense's has been renamed to `K-Dense-AI/scientific-agent-skills`. Measured by stars plus real skills.sh installs, the strongest community skill sources after Superpowers are mattpocock/skills, nextlevelbuilder/ui-ux-pro-max-skill, JuliusBrussee/caveman, addyosmani/agent-skills, coreyhaines31/marketingskills and K-Dense (science). Trail of Bits is the leading security source, although its installs are low. The "awesome" lists are directories, not installable skills. Two collections are going stale: travisvn (last push April 2026) and softaworks (last push March 2026).

### Cited Findings

**Repository facts (gh search, 2026-11-02 unless noted)** — each repo is at `https://github.com/<owner/repo>`

| owner/repo | Stars | Forks | Created | Last push | Licence | What it is |
|---|---|---|---|---|---|---|
| obra/superpowers | 310,912 | 27,671 | 2025-10-09 | 2026-10-29 | MIT | Development-method skills (section 2) |
| mattpocock/skills | 309,627 | 26,055 | 2026-02-03 | 2026-11-01 | MIT | "Skills for Real Engineers. Straight from my .agents directory." |
| nextlevelbuilder/ui-ux-pro-max-skill | 144,016 | 15,247 | 2025-11-30 | 2026-11-01 | MIT | "Design intelligence for building professional UI/UX" |
| JuliusBrussee/caveman | 116,828 | – | – | 2026-11-02 | Apache-2.0 | "why use many token when few token do trick" (terse-output and token-saving skill plus proxy) |
| addyosmani/agent-skills | 112,658 | – | – | 2026-11-01 | MIT | "Production-grade engineering skills for AI coding agents" |
| Leonxlnx/taste-skill | 108,231 | 7,298 | 2026-02-19 | 2026-10-31 | MIT | Art direction (**already installed**) |
| pbakaus/impeccable | 99,921 | 5,912 | 2025-11-16 | 2026-11-01 | Apache-2.0 | Design vocabulary (**already installed**) |
| ComposioHQ/awesome-claude-skills | 78,554 | 9,493 | 2025-10-17 | 2026-09-18 | none | Curated list |
| mvanhorn/last30days-skill | 66,309 | – | – | 2026-11-01 | MIT | Researches a topic across Reddit, X, YouTube, HN, Polymarket |
| blader/humanizer | 63,758 | – | – | 2026-10-28 | MIT | "Removes signs of AI-generated writing from text" |
| coreyhaines31/marketingskills | 57,945 | 8,525 | 2026-01-15 | 2026-10-31 | MIT | "CRO, copywriting, SEO, analytics, and growth engineering" |
| hesreallyhim/awesome-claude-code | 57,083 | 4,903 | 2025-04-19 | 2026-11-02 | NOASSERTION | Curated list of Claude Code resources |
| K-Dense-AI/scientific-agent-skills | 55,774 | – | – | 2026-11-02 | MIT | 177 science skills (renamed from claude-scientific-skills) |
| emilkowalski/skills | 52,864 | 3,079 | 2026-03-16 | 2026-11-02 | MIT | UI polish and motion (**already installed**) |
| kepano/obsidian-skills | 50,603 | – | – | 2026-09-15 | MIT | Obsidian CLI, markdown, bases, JSON Canvas |
| sickn33/agentic-awesome-skills | 49,022 | – | – | 2026-11-02 | MIT | "2,884+ reusable AI agent skills" |
| Nutlope/hallmark | 45,446 | – | – | 2026-10-29 | MIT | "Anti-AI-slop design skill" |
| wshobson/agents | 42,096 | 4,454 | 2025-07-24 | 2026-11-02 | MIT | Multi-harness plugin marketplace |
| vercel-labs/skills (vendor) | 37,717 | 3,262 | 2026-01-14 | 2026-10-30 | MIT | The `npx skills` CLI plus find-skills (**installed**) |
| VoltAgent/awesome-agent-skills | 36,753 | – | – | 2026-11-02 | MIT | Curated list of "1000+ agent skills" |
| alirezarezvani/claude-skills | 29,149 | 4,046 | 2025-10-19 | 2026-10-31 | MIT | Claims "380+ skills… 30+ Agents, 70+ custom commands" |
| OthmanAdi/planning-with-files | 27,823 | – | – | 2026-10-30 | MIT | File-based persistent planning |
| travisvn/awesome-claude-skills | 15,671 | 2,108 | 2025-10-16 | **2026-04-28** | none | Curated list (6 months without a push) |
| Jeffallan/claude-skills | 12,175 | – | – | 2026-10-30 | MIT | "67 Specialized Skills for Full-Stack Developers" |
| trailofbits/skills | 7,947 | 677 | 2026-01-14 | 2026-10-28 | CC-BY-SA-4.0 | Security research and audit plugins |
| softaworks/agent-toolkit | 2,614 | 247 | 2026-01-19 | **2026-03-05** | MIT | Curated skills (8 months without a push) |
| obra/superpowers-marketplace | 1,316 | – | – | 2026-10-21 | MIT | Superpowers plugin marketplace |
| jezweb/claude-skills | 1,094 | 112 | 2025-10-20 | 2026-10-09 | MIT | Cloudflare, React, Tailwind v4, AI integrations |
| trailofbits/skills-curated | 523 | – | – | 2026-07-14 | CC-BY-SA-4.0 | Trail of Bits' vetted third-party plugins |

Sources: gh `search/repositories` (2026-11-02) for each repo, e.g. [obra/superpowers](https://github.com/obra/superpowers), [mattpocock/skills](https://github.com/mattpocock/skills), [trailofbits/skills](https://github.com/trailofbits/skills), [K-Dense-AI/scientific-agent-skills](https://github.com/K-Dense-AI/scientific-agent-skills), [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills), [wshobson/agents](https://github.com/wshobson/agents), [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills), [travisvn/awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills), [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code), [alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills), [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), [softaworks/agent-toolkit](https://github.com/softaworks/agent-toolkit), [jezweb/claude-skills](https://github.com/jezweb/claude-skills). Repos with "–" in the forks column come from the same gh search (stars, push, licence only) or from LinklyAI [github-repos.csv](https://raw.githubusercontent.com/LinklyAI/best-skills/main/data/2026-11-02/raw/github-repos.csv).

**mattpocock/skills (Matt Pocock)**
- "My agent skills that I use every day to do real engineering - not vibe coding… Approaches like GSD, BMAD, and Spec-Kit try to help by owning the process. But while doing so, they take away your control… These skills are designed to be small, easy to adapt, and composable." Newsletter "~60,000 other devs". — [README](https://github.com/mattpocock/skills)
- Install: `claude plugin install mattpocock-skills@claude-plugins-official` (updates itself), or skills.sh, which "copies editable files into your project, and you update them by hand. Pick one per agent, because installing both gives you every skill twice." — [README](https://github.com/mattpocock/skills); also listed in [Anthropic's official marketplace](https://github.com/anthropics/claude-plugins-official/blob/main/.claude-plugin/marketplace.json)
- About 53 skills in the skills.sh top 600, among them grill-me 1,476,610, grill-with-docs 1,264,692, improve-codebase-architecture 1,208,903, tdd 1,182,780, handoff 1,080,972, triage 1,025,908, prototype 1,025,261, domain-modeling 919,836, diagnosing-bugs 876,433, code-review 834,148, to-spec 753,358, to-tickets 749,990, git-guardrails-claude-code 524,797, writing-great-skills 306,552 and caveman 214,564. — [skills-sh.csv](https://raw.githubusercontent.com/LinklyAI/best-skills/main/data/2026-11-02/raw/skills-sh.csv)
- grill-me is described as a design-interrogation tool that "pushes you to clarify a vague idea before any code is written." One reviewer got 16 questions in a session and 30–50 on bigger features. Install: `npx skills@latest add mattpocock/skills -s grill-me -g`. Some listicles wrongly describe it as a bug hunter (search summary) — [artificialcorner](https://artificialcorner.com/p/best-claude-code-skills), [gabrielvrl Medium](https://gabrielvrl.medium.com/top-3-claude-code-skills-i-use-every-day-bonus-dcd8f86d55df)
- grill-me ranked #2 in the 7-day social buzz list (83+ X posts, 37 GitHub mentions) and #4 in LinklyAI's WIS ranking. — [LinklyAI README](https://github.com/LinklyAI/best-skills)

**trailofbits/skills (Trail of Bits, security firm)**
- "Trail of Bits skills and plugins for AI-assisted security analysis, testing, and development." Install: `/plugin marketplace add trailofbits/skills`, then `/plugin menu`; Codex: `codex plugin marketplace add trailofbits/skills`. — [README](https://github.com/trailofbits/skills)
- Plugins include building-secure-contracts, entry-point-analyzer, agentic-actions-auditor (GitHub Actions AI-agent vulnerabilities), audit-context-building, c-review, differential-review, fp-check, insecure-defaults, rust-review (SARIF output), semgrep-rule-creator, sharp-edges, static-analysis (CodeQL, Semgrep, SARIF), supply-chain-risk-auditor (npm/PyPI/Go), testing-handbook-skills, variant-analysis, yara-authoring, constant-time-analysis, mutation-testing, property-based-testing, zeroize-audit, firebase-apk-scanner, modern-python ("uv, ruff, and pytest"), devcontainer-setup, gh-cli, second-opinion, open-sourcing, plus a novelty `let-fate-decide` (tarot cards). — [README](https://github.com/trailofbits/skills)
- trailofbits/skills-curated is Trail of Bits' reviewed list of third-party plugins. Its maintainers say they found published skills with backdoors and malicious hooks and "read every line of hooks and scripts" (search summary) — [trailofbits/skills-curated](https://github.com/trailofbits/skills-curated)
- No trailofbits skills appear in the skills.sh top 600, so each has fewer than 62,728 skills.sh installs. — [skills-sh.csv](https://raw.githubusercontent.com/LinklyAI/best-skills/main/data/2026-11-02/raw/skills-sh.csv)

**K-Dense-AI/scientific-agent-skills (K-Dense Inc.)**
- "Claude Scientific Skills is now Scientific Agent Skills." 177 skills covering biology, chemistry, medicine, physics, engineering, Earth science, data analysis and scientific communication; 100+ databases; version 2.72.0; security-scan and skill-test CI badges; described in arXiv:2609.00065. Install: `npx skills add K-Dense-AI/scientific-agent-skills`, or as an Agent Plugins package. — [README](https://github.com/K-Dense-AI/scientific-agent-skills)
- The old name `K-Dense-AI/claude-scientific-skills` no longer resolves in GitHub search (HTTP 422). — gh search, 2026-11-02

**coreyhaines31/marketingskills (Corey Haines, founder of the Conversion Factory agency)**
- "Built by Corey Haines… Conversion Factory — Corey's agency for conversion [optimization]." Skills include ab-testing, ad-creative, ads, ai-seo, analytics, aso, attribution, churn-prevention, co-marketing, cold-email and more. — [README](https://github.com/coreyhaines31/marketingskills)
- 44 skills in the skills.sh top 600: seo-audit 243,674; copywriting 242,599; marketing-psychology 169,221; content-strategy 169,077; ai-seo 156,087; programmatic-seo 154,485; copy-editing 154,041; site-architecture 126,919; cro 95,164; schema 82,419; launch 82,045 and others. They hold 8 of the top 15 places in the hot view. — [skills-sh.csv](https://raw.githubusercontent.com/LinklyAI/best-skills/main/data/2026-11-02/raw/skills-sh.csv)
- The VoltAgent awesome list mentions coreyhaines31 32 times, the most of any community author checked. — [VoltAgent README](https://github.com/VoltAgent/awesome-agent-skills) (grep count)

**wshobson/agents (Seth Hobson)**
- "The catalog contains 94 plugins… 202 agents, 185 skills, and 105 commands." Works across Claude Code, Codex CLI, Cursor, OpenCode, Antigravity, Copilot and Pi. Claude Code install: `/plugin marketplace add wshobson/agents` then e.g. `/plugin install python-development@claude-code-workflows`. — [README](https://github.com/wshobson/agents)
- Only 2 of its skills are in the skills.sh top 600 (typescript-advanced-types 96,126; tailwind-design-system 71,531). — [skills-sh.csv](https://raw.githubusercontent.com/LinklyAI/best-skills/main/data/2026-11-02/raw/skills-sh.csv)

**addyosmani/agent-skills**
- Lifecycle skills behind 9 slash commands (`/spec`, `/plan`, `/build`, `/test`, `/constraints`, `/review`, `/webperf`, `/ship`…). — [README](https://github.com/addyosmani/agent-skills)
- 19 skills in the top 600 at about 67K–78K each. There is also addyosmani/web-quality-skills accessibility (#587, 65,969). — [skills-sh.csv](https://raw.githubusercontent.com/LinklyAI/best-skills/main/data/2026-11-02/raw/skills-sh.csv)

**Other community repos with real traction**
- JuliusBrussee/caveman: 20 skills in the top 600. caveman is #80 at 604,417; caveman-commit, caveman-compress and caveman-review are at about 419K–423K. — [skills-sh.csv](https://raw.githubusercontent.com/LinklyAI/best-skills/main/data/2026-11-02/raw/skills-sh.csv)
- tt-a1i/archify (92,574 stars): "Turn any idea, plan, or codebase into a beautiful interactive diagram". skills.sh #333, 186,328. — [github-repos.csv](https://raw.githubusercontent.com/LinklyAI/best-skills/main/data/2026-11-02/raw/github-repos.csv), [skills-sh.csv](https://raw.githubusercontent.com/LinklyAI/best-skills/main/data/2026-11-02/raw/skills-sh.csv)
- Repos with a lot of stars but few skills.sh installs: affaan-m/ECC (295,106 stars, "agent harness performance optimization system"); multica-ai/andrej-karpathy-skills (228,247 stars, "A single CLAUDE.md file", last push 2026-04-20); DietrichGebert/ponytail (182,110 stars; skills.sh #394, 115,024); morluto/rea (418,741 stars, reverse engineering). — [gh search](https://github.com/affaan-m/ECC), [LinklyAI top repos](https://github.com/LinklyAI/best-skills)
- Mega-collections: sickn33/agentic-awesome-skills claims 2,884+ skills and alirezarezvani/claude-skills claims 380+. Neither has a skill in the skills.sh top 600. — [gh search](https://github.com/sickn33/agentic-awesome-skills), [skills-sh.csv](https://raw.githubusercontent.com/LinklyAI/best-skills/main/data/2026-11-02/raw/skills-sh.csv)

**Awesome lists: how often they mention key authors (grep of README, 2026-11-02)**
- obra/superpowers: VoltAgent 15, travisvn 5, hesreallyhim 2. trailofbits: VoltAgent 21. mattpocock: VoltAgent 1, hesreallyhim 0, travisvn 0. pbakaus, emilkowalski and wshobson: 0 in all three. ComposioHQ's README was not at `main` (404), so it was not counted. — [VoltAgent](https://github.com/VoltAgent/awesome-agent-skills), [travisvn](https://github.com/travisvn/awesome-claude-skills), [hesreallyhim](https://github.com/hesreallyhim/awesome-claude-code)

### Inferences
- The awesome lists lag the market. Matt Pocock's skills dominate installs but get almost no mentions there, and travisvn hasn't been updated since April. The lists are useful for discovery, not as a quality signal.
- Mega-collections (alirezarezvani, sickn33, wshobson's 185 skills) are starred heavily but rarely installed from skills.sh. That fits the critique in section 5 that big bundles are bookmarked more than they are used.
- Trail of Bits stands out for author reputation and curation discipline, not for install counts. For a website project, the relevant plugins are `insecure-defaults`, `supply-chain-risk-auditor`, `differential-review` and `static-analysis`.

### Gaps
- No per-plugin install counts exist for Claude Code plugin marketplaces (trailofbits, wshobson, superpowers), so adoption can't be compared on equal terms.
- Fork counts for some repos weren't collected, because the simpler gh query or the LinklyAI CSV doesn't carry them.
- jezweb/claude-skills and softaworks/agent-toolkit skill lists weren't read in detail. Both are small (1.1K and 2.6K stars) and absent from the top 600.

## 4. Standout community skills: install identifiers, adoption and descriptions (overlap with the user's project flagged)

### Takeaway
The best-attested community skills not already in the project are mostly engineering-process skills: Matt Pocock's grill-me, tdd, diagnosing-bugs, improve-codebase-architecture and handoff, or Superpowers' systematic-debugging and verification-before-completion. Next are website-relevant marketing skills (Corey Haines' copywriting, seo-audit, cro and schema) and security reviews (Trail of Bits). Most popular design skills overlap with the Taste, Impeccable and Emil skills already installed.

### Cited Findings
Install counts are from the skills.sh snapshot of 2026-11-02 ([skills-sh.csv](https://raw.githubusercontent.com/LinklyAI/best-skills/main/data/2026-11-02/raw/skills-sh.csv)). Stars come from gh (2026-11-02). Descriptions are from each repo's README or the leaderboard listing.

| Skill | Install identifier | skills.sh URL | Installs (rank) | Repo stars / last push / licence | What it does |
|---|---|---|---|---|---|
| grill-me | `npx skills add mattpocock/skills --skill grill-me` (or the plugin `mattpocock-skills@claude-plugins-official`) | https://skills.sh/mattpocock/skills/grill-me | 1,476,610 (#2) | 309,627 / 2026-11-01 / MIT | Interrogates a plan or design with questions before any code is written ([review](https://artificialcorner.com/p/best-claude-code-skills)) |
| grill-with-docs | `… mattpocock/skills --skill grill-with-docs` | https://skills.sh/mattpocock/skills/grill-with-docs | 1,264,692 (#6) | same | Grilling variant grounded in docs (description from the name; SKILL.md not read) |
| improve-codebase-architecture | `… --skill improve-codebase-architecture` | https://skills.sh/mattpocock/skills/improve-codebase-architecture | 1,208,903 (#8) | same | Architecture improvement pass (SKILL.md not read) |
| tdd | `… --skill tdd` | https://skills.sh/mattpocock/skills/tdd | 1,182,780 (#10) | same | Test-driven development loop |
| handoff | `… --skill handoff` | https://skills.sh/mattpocock/skills/handoff | 1,080,972 (#14) | same | Session handoff (SKILL.md not read) |
| diagnosing-bugs | `… --skill diagnosing-bugs` | https://skills.sh/mattpocock/skills/diagnosing-bugs | 876,433 (#30) | same | Bug diagnosis (SKILL.md not read) |
| brainstorming | `/plugin install superpowers@claude-plugins-official` (or `npx skills add obra/superpowers --skill brainstorming`) | https://skills.sh/obra/superpowers/brainstorming | 413,920 (#193) | 310,912 / 2026-10-29 / MIT | "Draws out what you actually want, and why" before building ([README](https://github.com/obra/superpowers)) |
| systematic-debugging | same plugin / `--skill systematic-debugging` | https://skills.sh/obra/superpowers/systematic-debugging | 316,373 (#264) | same | "4-phase root cause process" |
| verification-before-completion | same / `--skill verification-before-completion` | https://skills.sh/obra/superpowers/verification-before-completion | 260,920 (#277) | same | "Ensure it's actually fixed" |
| writing-plans | same / `--skill writing-plans` | https://skills.sh/obra/superpowers/writing-plans | 290,684 (#269) | same | Bite-sized plans with exact paths and verification steps |
| copywriting | `npx skills add coreyhaines31/marketingskills --skill copywriting` | https://skills.sh/coreyhaines31/marketingskills/copywriting | 242,599 (#291) | 57,945 / 2026-10-31 / MIT | Marketing copy ([README](https://github.com/coreyhaines31/marketingskills)) |
| seo-audit | `… --skill seo-audit` | https://skills.sh/coreyhaines31/marketingskills/seo-audit | 243,674 (#290) | same | SEO audit |
| cro / schema / ai-seo | `… --skill cro` / `schema` / `ai-seo` | https://skills.sh/coreyhaines31/marketingskills/cro | 95,164 / 82,419 / 156,087 | same | Conversion optimization; structured data; optimizing for AI search citations |
| caveman | `npx skills add juliusbrussee/caveman --skill caveman` | https://skills.sh/juliusbrussee/caveman/caveman | 604,417 (#80) | 116,828 / 2026-11-02 / Apache-2.0 | Terse, token-saving output style ([repo description](https://github.com/JuliusBrussee/caveman)) |
| ui-ux-pro-max | `npx skills add nextlevelbuilder/ui-ux-pro-max-skill --skill ui-ux-pro-max` | https://skills.sh/nextlevelbuilder/ui-ux-pro-max-skill/ui-ux-pro-max | 428,860 (#182) | 144,016 / 2026-11-01 / MIT | UI/UX "design intelligence". **Overlaps Taste and Impeccable** |
| archify | `npx skills add tt-a1i/archify --skill archify` | https://skills.sh/tt-a1i/archify/archify | 186,328 (#333) | 92,574 / 2026-10-31 / Apache-2.0 | Ideas or codebases to interactive diagrams |
| code-review-and-quality | `npx skills add addyosmani/agent-skills --skill code-review-and-quality` | https://skills.sh/addyosmani/agent-skills/code-review-and-quality | 78,320 (#515) | 112,658 / 2026-11-01 / MIT | Review gate in Osmani's lifecycle |
| hallmark | `npx skills add nutlope/hallmark --skill hallmark` | https://skills.sh/nutlope/hallmark/hallmark | 84,481 (#481) | 45,446 / 2026-10-29 / MIT | "Anti-AI-slop design skill". **Overlaps Taste** |
| make-interfaces-feel-better | `npx skills add jakubkrehel/make-interfaces-feel-better` | https://skills.sh/jakubkrehel/make-interfaces-feel-better/make-interfaces-feel-better | 74,724 (#536) | 3,893 / 2026-08-29 | Interface polish. **Overlaps Emil and Impeccable** |
| audit-website | `npx skills add squirrelscan/skills --skill audit-website` | https://skills.sh/squirrelscan/skills/audit-website | 74,652 (#537) | 105 / 2026-10-30 | Website QA, "300+ audit rules". Partial overlap with Playwright plus Impeccable audit |
| humanizer | `npx skills add blader/humanizer` (skill name not verified) | not in top 600 | under 62,728 on skills.sh | 63,758 / 2026-10-28 / MIT | "Removes signs of AI-generated writing from text" |
| Trail of Bits security plugins | `/plugin marketplace add trailofbits/skills` | not in top 600 | under 62,728 | 7,947 / 2026-10-28 / CC-BY-SA-4.0 | e.g. insecure-defaults, supply-chain-risk-auditor, differential-review ([README](https://github.com/trailofbits/skills)) |

**Overlap with what the project already has** — project `.claude/skills/` and `skills-lock.json`, checked 2026-11-02
- Installed: design-taste-frontend (Leonxlnx/taste-skill), impeccable (pbakaus/impeccable, as one umbrella skill), the emilkowalski/skills set (animate, animate-expo, animation-performance, animation-vocabulary, apple-design, ask-sonner, break-ui, emil-design-eng, find-animation-opportunities, improve-animations, mobile-native, pick-ui-library, prototype, remove-animations, review-animations, write-swift), find-skills (vercel-labs/skills), and the project's own build-website.
- leonxlnx/taste-skill also lists 12 more skills on skills.sh (high-end-visual-design 458,852; redesign-existing-projects 458,724; minimalist-ui 425,124; full-output-enforcement 401,064; gpt-taste 399,521; industrial-brutalist-ui 396,933; stitch-design-taste 394,886; brandkit 390,707; image-to-code 385,912; imagegen-frontend-web/mobile; design-taste-frontend-v1). These are variants of the installed Taste skill. — [skills-sh.csv](https://raw.githubusercontent.com/LinklyAI/best-skills/main/data/2026-11-02/raw/skills-sh.csv)
- pbakaus/impeccable's standalone skills on skills.sh (polish, critique, audit, animate, adapt, clarify, optimize, colorize, bolder, delight, distill, quieter, typeset, overdrive; about 62K–85K each) duplicate the `/impeccable <command>` subcommands already installed. — [skills-sh.csv](https://raw.githubusercontent.com/LinklyAI/best-skills/main/data/2026-11-02/raw/skills-sh.csv)

### Inferences
- **Name collisions to avoid:**
  - mattpocock/skills has a `prototype` skill (1,025,261 installs). An emilkowalski `prototype` is already installed, so installing the whole Pocock bundle would clash. Install Pocock skills one at a time with `--skill`.
  - Pocock's `code-review` would shadow the session's built-in `/code-review`.
  - Pocock's `caveman` duplicates juliusbrussee/caveman.
  - Impeccable's standalone `animate` would clash with Emil's `animate`.
- **Process skills:** Superpowers and the Pocock bundle overlap (both have TDD, planning, review and debugging). Choose one. Pocock's skills are explicitly "small… composable" and don't "own the process", so they fit more easily next to Taste's fixed run order than Superpowers' mandatory brainstorm → plan → subagent workflow.
- **Not new additions:** ui-ux-pro-max, hallmark, make-interfaces-feel-better, uizze ui-taste and Taste's own variant skills would duplicate the art-direction, polish and anti-slop coverage the project already has.
- **Fill real gaps in a website pipeline:**
  - Corey Haines' copywriting, seo-audit, ai-seo, schema and cro (Taste's "words" step and post-launch SEO)
  - blader/humanizer (de-AI-ing copy)
  - Trail of Bits' insecure-defaults and supply-chain-risk-auditor (if the site has a backend or dependencies)
  - a debugging or verification skill (Superpowers' systematic-debugging and verification-before-completion, or Pocock's diagnosing-bugs)

### Gaps
- Descriptions marked "SKILL.md not read" are inferred from skill names. The SKILL.md files for grill-with-docs, improve-codebase-architecture, handoff and diagnosing-bugs weren't opened.
- The exact `--skill` name for blader/humanizer wasn't checked, and humanizer's skills.sh install count is unknown.
- No independent benchmark of any of these skills' effect on output quality was found, apart from automated Tessl rubric scores (section 5).

## 5. Which community skills are most recommended in curated lists, blogs, HN and Reddit, and which are criticised as low quality or bloated?

### Takeaway
Listicles and reviews in 2026 consistently recommend Superpowers and Matt Pocock's grill-me, alongside vendor staples (frontend-design, vercel-react-best-practices, skill-creator, webapp-testing). The consistent criticism is about bloat and noise rather than any one skill: duplicate and near-duplicate skills, oversized SKILL.md files, mega-bundles that flood context, stacked process frameworks that compete, install counts that can be gamed, and real supply-chain malware in registries.

### Cited Findings
- **Recommended:**
  - Superpowers is the most consistently recommended workflow pack, and grill-me is a frequent top pick.
  - Frontend Design, Vercel React Best Practices, Anthropic's skill-creator and webapp-testing, and Context7 appear in most 2026 rankings.
  - (search summary) — [Firecrawl](https://www.firecrawl.dev/blog/best-claude-code-skills), [designrevision](https://designrevision.com/blog/best-claude-code-skills), [artificialcorner](https://artificialcorner.com/p/best-claude-code-skills), [buildthisnow](https://www.buildthisnow.com/blog/guide/mechanics/best-claude-code-skills-2026)
- A Composio-authored DEV post on skills that "actually changed how I work" describes Superpowers as having "/brainstorm, /write-plan, /execute-plan commands that basically turn Claude into a proper dev workflow" (search summary; those command names predate the v5 deprecations) — [DEV Community / composiodev](https://dev.to/composiodev/10-claude-skills-that-actually-changed-how-i-work-2b58)
- **Stacking warning:** running Superpowers alongside other planning-focused skills "can give Claude two competing processes for the same request", and token overhead varies by skill (search summary) — [buildthisnow](https://www.buildthisnow.com/blog/guide/mechanics/best-claude-code-setups-2026)
- **Hacker News bloat critique.** On an HN thread about Addy Osmani's "Agent Skills", commenters argued:
  - skills are long and wasteful, and mostly generated by Claude Code or Opus
  - people install MCPs and skills without understanding them, cluttering context and wasting "more than 50k tokens"
  - (search summary; HN blocked here, so treat as anecdotal) — [HN item 48015397](https://news.ycombinator.com/item?id=48015397)
- **Duplication and size data.** A Hugging Face community analysis ("The Wild West of Agent Skills") reports:
  - 46.3% of skills are duplicates or near-duplicates
  - the average skill is about 1,900 tokens, but the top 1% exceed 100,000 tokens
  - (search summary; HF blocked) — [Hugging Face blog](https://huggingface.co/blog/zhongshsh/agent-skills-analysis)
- **Over-installation advice.** A MindStudio guide calls installing many skills the most common mistake and suggests 5–8 tools per project. A critique it cites argues that most public skills "actively hurt - adding tokens, adding latency, injecting constraints that make the output narrower" (search summary) — [MindStudio](https://www.mindstudio.ai/blog/claude-code-skills-common-mistakes-guide)
- **Install counts as a signal.** Reviewers note that skills.sh ranks purely by install count, which "can be gamed" and "doesn't correlate with quality". skills.sh says it deduplicates hourly so one install can't be replayed. Vercel's position is that install count is today's best quality signal until tests and benchmarks arrive (search summary) — [vibecoding.app](https://vibecoding.app/blog/skills-sh-review), [rywalker.com](https://rywalker.com/research/skills-sh), [Vercel](https://vercel.com/blog/state-of-agent-skills)
- **Security.** Snyk's "ToxicSkills" audit (February 2026) scanned 3,984 skills from ClawHub and skills.sh. About 13.4% had critical-severity issues and 76 were confirmed malicious after human review. Secondary sources disagree on other figures (36.82% with any flaw; "1,467" counted variously as flawed or malicious) (search summary; primary Snyk report not seen) — [Daniel Vaughan, Codex CLI blog](https://codex.danielvaughan.com/2026/06/07/agent-skill-supply-chain-crisis-clawhavoc-toxicskills-skillsieve-codex-cli-defence/), [CSA research note](https://labs.cloudsecurityalliance.org/research/briefing-csa-research-note-skill-md-agent-context-poisoning/)
- Trail of Bits started skills-curated after finding published skills with backdoors and malicious hooks (search summary) — [trailofbits/skills-curated](https://github.com/trailofbits/skills-curated)
- NVIDIA/SkillSpector, a "Security scanner for AI agent skills", has 23,928 stars, pushed 2026-11-02. — [gh search](https://github.com/NVIDIA/SkillSpector)
- **ui-ux-pro-max quality.** Tessl's automated SKILL.md reviews score ui-ux-pro-max listings at about 45–58%, partly because some forks lack a "Use when" clause. A Spanish-language hands-on review (June 2026) asks whether it "really designs like a senior or only appears to" (findings not visible) (search summary) — [Tessl review](https://tessl.io/registry/skills/github/nextlevelbuilder/ui-ux-pro-max-skill/ui-ux-pro-max/review), [wilmerhurtado.com](https://wilmerhurtado.com/blog/skill-review-ui-ux-pro-max-realmente-disena-como-un-senior-o-solo-lo-aparenta)
- **Matt Pocock's framing.** He positions his skills against heavyweight process frameworks (GSD, BMAD, Spec-Kit) that "take away your control and make bugs in the process hard to resolve". — [mattpocock/skills README](https://github.com/mattpocock/skills)
- **Mega-collection size claims** (for context on the bloat critique): sickn33/agentic-awesome-skills "2,884+ reusable AI agent skills"; alirezarezvani/claude-skills "380 Claude Code skills… 30+ Agents, 70+ custom commands"; mukul975/Anthropic-Cybersecurity-Skills "817 structured cybersecurity skills" (35,428 stars). The last uses "Anthropic" in its name but is not an Anthropic repo. — [gh search results](https://github.com/sickn33/agentic-awesome-skills), [alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills), [mukul975/Anthropic-Cybersecurity-Skills](https://github.com/mukul975/Anthropic-Cybersecurity-Skills)

### Inferences
- The strongest quality signals are a well-known author (Vincent, Pocock, Trail of Bits, Osmani, Haines), a listing in Anthropic's official plugin marketplace (Superpowers and mattpocock-skills are the only general community packs there among those checked), steady recent pushes, and real installs per skill. Install rank alone isn't a usable signal.
- Mega-collections with hundreds or thousands of skills, and look-alike repos using names such as "superpowers" or "Anthropic", should be treated as low-signal or risky. This fits the HN, HF and Snyk critiques.
- Before installing any community skill, read its SKILL.md and any hooks or scripts, as the project's find-skills rules already require. Trail of Bits' curation stance and the Snyk figures support this.

### Gaps
- No primary Reddit (r/ClaudeAI) threads came up in search. Reddit sentiment is not covered.
- The HN thread, the Hugging Face analysis, Vercel's report and the Snyk report were seen only through search summaries, because those hosts are blocked here. Exact figures should be checked against the originals.
- No benchmark comparing Superpowers with mattpocock/skills, or with no skills at all, was found. Effectiveness claims (e.g. Superpowers 6 being "50% faster, 60% cheaper") come from the authors themselves.
- No direct criticism of caveman, impeccable, taste-skill or Emil's skills was found.
