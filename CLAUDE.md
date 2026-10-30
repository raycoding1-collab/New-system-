# Design team setup

This project gives Claude Code a design team: three design skills and two MCP tools, plus Find Skills for getting more skills. Together they let
Claude design a website, build it, and check its own work in a real browser.

| Piece | What it does here | Where |
| --- | --- | --- |
| **Taste** (`design-taste-frontend`) | Art direction. It deals one of 20 researched directions drawn from a study of 247 curated sites, finds real photos in open archives, and fails the page on slop in a real browser at 1440/768/390. | `.claude/skills/design-taste-frontend/` |
| **Impeccable** (`/impeccable <command>`) | Design vocabulary and passes: `critique`, `audit`, `polish`, `typeset`, `layout`, `colorize`, `bolder`, `quieter`, `harden`, `adapt` and more, plus a detector for AI design tells. | `.claude/skills/impeccable/`, `.claude/agents/impeccable-*.md` |
| **Emil Kowalski's skills** | The small details that make UI feel polished: motion (`animate`, `emil-design-eng`, `animation-performance`, `find-animation-opportunities`, `remove-animations`, `improve-animations`), stress tests (`break-ui`), phone feel (`mobile-native`), Apple-style motion (`apple-design`). | `.claude/skills/<name>/` |
| **Figma MCP** | Reads Figma frames, variables, components and screenshots so a design can be turned into code. | `.mcp.json` → `figma` |
| **Playwright MCP** | Opens the site in a real browser to click through it, read the console, resize it and take screenshots. | `.mcp.json` → `playwright` |
| **Find Skills** (`find-skills`) | Searches the skills.sh directory for skills that fit the task, vets them by install count and author, and installs the one the user approves. | `.claude/skills/find-skills/` |

To run the whole pipeline on a brief, use `/build-website <describe the site>`.

## Finding more skills

Use `find-skills` when the user asks for a skill, or when a task would clearly benefit from one that
isn't installed. Check `.claude/skills/` first, so you don't install a second skill for something
already covered (design, motion, browser testing). Two project rules apply on top of the skill's steps:

- **Install only after the user approves**, naming the exact `owner/repo` and skill. Show the install
  count, the author and the skills.sh link first, as the skill describes.
- **Install into the project, not globally**, so the skill is committed and tracked in `skills-lock.json`:
  `npx skills add <owner/repo> --skill <name> --agent claude-code --copy -y`. Use the skill's `-g`
  (user-level) form only if the user asks for a global install. After installing, tell the user to start
  a new session so the skill loads.

## Who leads what

Taste and Impeccable both offer to handle new pages. To keep one owner per stage:

- **New page or site, redesign, restyle:** Taste leads. Follow its run in order: brief, argument, draw,
  idea, words, build, gate, look, move, report. Don't swap in a different art direction partway through.
- **Critique, audit, and focused refinement of existing UI:** Impeccable leads (`/impeccable critique`,
  `/impeccable audit`, `/impeccable polish`, and so on). After a Taste build, use Impeccable for the
  critique, audit and polish passes.
- **Motion:** use Emil Kowalski's rules as the bar for easing, duration, interruption and reduced motion.
  The skills to apply are `animate` and `emil-design-eng`, plus `animation-performance` when frames drop.
  Keep Taste's motion budget (step 9: at least eight elements actually moving) and implement it to Emil's standard.
- **Implementing a Figma design:** Figma is the source of truth. Follow the Figma rules below and skip
  Taste's direction draw. Taste's gate and Impeccable's audit and polish still apply.
- **Verification:** use Playwright MCP to click through the running site: every link, button, form and
  menu. Also check the console, resize to 1440, 768 and 390, and emulate `prefers-reduced-motion`. Taste's
  `inspect.mjs` is the measured gate; Playwright covers behaviour.

Three of Emil's skills (`review-animations`, `pick-ui-library`, `prototype`) only run when the user
invokes them. Suggest them, but don't run them unasked.

## Figma MCP server rules

From Figma's guide (github.com/figma/mcp-server-guide):

- The Figma MCP server provides an assets endpoint which can serve image and SVG assets
- IMPORTANT: If the Figma MCP server returns a localhost source for an image or an SVG, use that image or SVG source directly
- IMPORTANT: DO NOT import/add new icon packages, all the assets should be in the Figma payload
- IMPORTANT: do NOT use or create placeholders if a localhost source is provided

Required flow for every Figma-driven change:

1. Run `get_design_context` first to fetch the structured representation for the exact node(s).
2. If the response is too large or truncated, run `get_metadata` to get the high-level node map, then re-fetch only the required node(s) with `get_design_context`.
3. Run `get_screenshot` for a visual reference of the node variant being implemented.
4. Only after you have both `get_design_context` and `get_screenshot`, download any assets needed and start implementation.
5. Translate the output (usually React + Tailwind) into this project's conventions, styles and framework. Reuse the project's color tokens, components and typography wherever possible.
6. Validate against Figma for 1:1 look and behavior before marking complete.

Implementation rules:

- Treat the Figma MCP output (React + Tailwind) as a representation of design and behavior, not as final code style.
- Replace Tailwind utility classes with the project's preferred utilities/design-system tokens when applicable.
- Reuse existing components (e.g., buttons, inputs, typography, icon wrappers) instead of duplicating functionality.
- Use the project's color system, typography scale, and spacing tokens consistently.
- Respect existing routing, state management, and data-fetch patterns already adopted in the repo.
- Strive for 1:1 visual parity with the Figma design. When conflicts arise, prefer design-system tokens and adjust spacing or sizes minimally to match visuals.
- Validate the final UI against the Figma screenshot for both look and behavior.
- If you're getting raw values instead of tokens, run `get_variable_defs` ("Get the variable names and values used in this frame").

## Claude Code on the web (cloud sessions)

When `CLAUDE_CODE_REMOTE=true`:

- **Taste's browser scripts** don't find the container's Chromium on their own, and Chromium won't start as
  root without `--no-sandbox`. Prefix every `inspect.mjs` and `scenes.mjs` run with
  `CHROME_PATH="$PWD/.claude/bin/cloud-chromium"` (run from the project root). `draw.mjs` and `lint.mjs`
  need no browser.
- **Playwright MCP** switches itself to the container's Chromium, headless (`.claude/mcp/playwright.mjs`).
  Serve the site on `localhost`; external sites go through the egress proxy and may be blocked.
- **Find Skills search** (`npx skills find`, the skills.sh leaderboard) needs `skills.sh`. If that host
  is blocked, the CLI prints "No skills found", which does not mean no skill exists. Tell the user the
  directory couldn't be reached. Installing from a known `owner/repo` still works, because it goes
  through GitHub.
- **Figma MCP** (`mcp.figma.com`) and **Taste's photo search** (Wikimedia Commons, Openverse, the Met,
  Art Institute of Chicago, Internet Archive, NASA) work only if the environment's network policy allows
  those hosts. If they're blocked, say so. Don't fake the missing result: no placeholder "Figma"
  values and no stock-photo stand-ins presented as found photos. Taste's own fallback is to draw the
  pictures and report that the archives couldn't be searched.
