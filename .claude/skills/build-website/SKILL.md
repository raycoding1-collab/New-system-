---
name: build-website
description: "Build a complete website from a one-line description (or a Figma link) with the project's design team: Taste for art direction, Impeccable for critique and polish, Emil Kowalski's skills for motion, Figma MCP for designs, Playwright MCP for checking the result in a real browser. Only runs when explicitly invoked."
argument-hint: "<describe the site, or paste a Figma frame URL>"
disable-model-invocation: true
---

# Build a website with the design team

The brief is: $ARGUMENTS

Work through the stages below in order. Each one hands off to a skill that already holds the detailed
rules. Load that skill and follow it; don't restate or override it. CLAUDE.md says which skill leads
when two of them overlap.

## 0. Read the brief

- If the brief contains a `figma.com` URL, this is a **Figma build**. Do stage 1F instead of stage 1.
- Otherwise it is a **Taste build**. If the brief is vague, state your reading in one line and carry on.
  Ask only when a missing fact blocks the work (for example, no product name).
- Find out what the stack is. In an empty project, build plain HTML/CSS/JS unless the brief names a
  framework. Check the dependency file before adding anything.
- In a cloud session (`CLAUDE_CODE_REMOTE=true`), apply the notes at the end of CLAUDE.md (CHROME_PATH
  for Taste's scripts, blocked hosts).

## 1. Design and build: Taste

Load the `design-taste-frontend` skill and follow **the run** from step 1 through step 8 (Look): brief and
inventory, argument, draw three directions and choose one, idea, words, build it still, gate (`lint.mjs`
and `inspect.mjs` until 0 FAIL), then look at every screenshot and fix the top three problems for at most
three rounds. For a dashboard or app screen, follow its `references/app-screens.md` run instead.

## 1F. Design from Figma: Figma MCP

Follow "Figma MCP server rules" in CLAUDE.md exactly. Run `get_design_context`, then `get_screenshot`,
then fetch the assets, then implement 1:1 in this project's conventions. Skip Taste's draw, because
Figma is the direction. Still run Taste's `lint.mjs` and `inspect.mjs` as a gate. If a Taste rule
conflicts with the Figma design, the design wins: pass `--allow <rule>` for that rule only and say so
in the report. If the Figma MCP server is not connected or cannot be reached, stop and tell the user
what to connect. Never invent values in place of the design.

## 2. Motion: Emil Kowalski's skills

Build Taste's step 9 motion layer: a signature move, staggered section entrances, feedback on every
control, and one moving picture. Make each decision with the `animate` skill: should it animate,
purpose, properties, curve and duration, interruption, exit. Hold the result to `emil-design-eng`.
Animate only transform and opacity, give every move a `prefers-reduced-motion` fallback, and never
leave content hidden if a script fails. If anything stutters, apply `animation-performance`. For a
phone-first site, apply `mobile-native`.

## 3. Critique, audit, polish: Impeccable

Load the `impeccable` skill (run its Setup step), then on the built page:

1. `critique`: fix what it scores lowest.
2. `audit`: accessibility, performance, responsive. Fix every real finding.
3. `polish`: the final pass before shipping.

Stay within the direction you chose. These passes refine the page; they don't redesign it.

## 4. Check it in a real browser: Playwright MCP

Serve the production build (or the built `index.html`) on `localhost`, then with the Playwright MCP tools:

- Open the page, and click every link, button, menu and form. Each should do what it says.
- Read the console. Zero errors.
- Resize to 1440, 768 and 390 wide and screenshot each. Nothing overflows, clips or overlaps.
- Tab through the page: a visible focus state on everything interactive, in a sensible order.
- Emulate `prefers-reduced-motion: reduce`: all content is visible and nothing travels.
- Use `break-ui` thinking on any component fed by data (long names, empty lists, huge numbers).

Fix what fails. Then run Taste's `inspect.mjs` once more on the final version and confirm 0 FAIL.

## 5. Report

Follow Taste's step 10 report checklist, and add:

- The final screenshots at each width.
- What Playwright checked and what it found.
- Impeccable's critique scores (first and last round).
- Every found picture with its credit (`assets.mjs --credits`), and any sample content to replace before launch.
- Anything you couldn't run (blocked host, missing browser, no Figma access), stated plainly.
- Optional extras the user can invoke: `/review-animations` for a strict motion review, and
  `/prototype` to compare alternative versions of a section.
