# Cinderdeep

A short action-platformer demo in the style of a metroidvania, built for phones first. You play the Wick, a
candle-headed wanderer, waking at the bottom of a buried city of wax. Find the flicker relic, get past the
molten channels and put out the Chandler. It's short: seven rooms, one secret and one boss.

Everything is original: the world, the characters and the art, which is all drawn in code. There are no
image or audio files, and the game has no dependencies.

## Play it

- **On a phone:** open `dist/cinderdeep.html`. It is one self-contained file, so you can AirDrop it, email
  it, or host it anywhere. Hold the phone sideways. Add it to your home screen to play it full screen.
- **From the source:** serve this folder and open `index.html`:
  `python3 -m http.server -d games/cinderdeep 8000`, then visit `http://localhost:8000`.

## Install it as an app

Installed, Cinderdeep gets its own home-screen icon, opens full screen in landscape with no browser bars,
and plays offline.

1. **Put it on the web (once).** On GitHub open the repository's **Settings → Pages**. Under *Build and
   deployment* pick **Deploy from a branch**, choose the branch that has the game and the **/ (root)**
   folder, then **Save**. After a minute the game is at
   `https://raycoding1-collab.github.io/New-system-/games/cinderdeep/`.
2. **iPhone or iPad:** open that address in Safari, tap **Share**, then **Add to Home Screen**.
3. **Android:** open it in Chrome and tap **Install as an app** on the title screen (or Chrome's menu,
   then **Install app**).

The app checks for updates in the background, and a new version appears the next time you open it.

## Controls

| Action | Touch | Keyboard | Gamepad |
| --- | --- | --- | --- |
| Walk | Drag anywhere on the left half | Arrow keys or A / D | Left stick or d-pad |
| Jump (hold to go higher) | Arrow button | Space, Z or K | A |
| Strike (aim with up or down) | Blade button | X or J | X |
| Flicker (dash, once found) | Double-arrow button | C, L or Shift | RB / RT |
| Hurl a cinder (tap) / Mend a flame (hold) | Flame button | F or V | B |
| Rest at a shrine | Rest button, or push up | Up or W | Up |
| Drop through a ledge | Down + jump | Down + Space | Down + A |
| Map / Pause | Top-right buttons | M or Tab / Esc or P | Back / Start |

On touch you can slide your thumb from one action button to another without lifting it.

## What's in the demo

- **Seven rooms** across three areas (Upper Wicks, The Long Drip, Chandler's Hall), joined on one world grid.
- **Movement:** run, variable-height jump, coyote time, jump buffering, jump-through ledges, and the flicker
  dash, which you need to cross the molten channels.
- **Combat:** a three-way strike (side, up, and down in mid-air). Striking down bounces you off enemies and
  thorns. Hits fill your tallow, which you spend to heal (hold) or to hurl a piercing cinder (tap). Enemy
  globs can be struck out of the air.
- **Enemies:** wicklings that patrol, soot moths that wind up and swoop, tallow sentinels that charge,
  spitter blooms that fire molten globs, and the Chandler. The boss has a leap that sends shockwaves along
  the floor, a charge that leaves it stunned, a sweep, wax rain, and in phase two a volley of blue-flame orbs.
- **Progression:** lantern shrines heal you and save your game. If you die you drop your embers at your last
  safe spot, and you can walk back to collect them. A cracked wall hides a wax heart that adds one health.
  At the second shrine you can spend 80 embers to temper your weapon.
- **Map, save and continue,** with progress kept in `localStorage`.

## How it stays fast on a phone

- **Fixed 120 Hz simulation** with an accumulator, so movement is identical on 60 Hz and 120 Hz screens.
- **Terrain is drawn once per room** into 512-unit chunks at the screen's resolution. During play a frame
  just copies a few of those images. Building the chunks takes 15 to 30 ms and happens during the fade
  between rooms.
- **Lighting is rendered at a quarter of the screen resolution:** darkness with light cut out of it, scaled
  up as one image. Glows are pre-rendered sprites drawn additively.
- **Scenery is painted once.** Each area has three parallax layers (a far skyline or cavern, mid arcades or
  rock arches, near pillars), and each room gets a back wall built from its own ledges and ceilings (arches,
  statues, cages, roots). All of it is drawn into canvases at reduced resolution when you enter, and a frame
  copies only the visible part. Particles come from a fixed pool of up to
  420, so nothing is allocated during play.
- **Pixel density is capped at 2×.** If frames stay slow, quality steps down to 1.5× and then 1×, with fewer
  particles. Force a level with `?quality=0`, `1` or `2`.
- Measured in headless Chromium on an 844×390 screen at 3× density (rendering at 1.5×): about 2 to 3 ms of
  script time per frame, against a 16.7 ms budget at 60 fps. Check a real phone with `?debug`.

## Project layout

```
index.html        page shell, menus and CSS
js/util.js        constants and helpers
js/rooms.js       the seven room maps, areas and hint text
js/audio.js       synthesised sound effects and music (Web Audio)
js/input.js       keyboard, gamepad and multi-touch controls
js/art.js         sprites and terrain chunk rendering
js/scenery.js     painted parallax layers, each room's back wall, fog
js/world.js       rooms, tile collision, particles
js/player.js      the Wick
js/enemies.js     enemies, projectiles, pickups and props
js/boss.js        the Chandler
js/bot.js         the autopilot
js/game.js        loop, camera, combat, lighting, HUD, map, saving
tools/build.mjs   inlines everything into dist/cinderdeep.html
tools/check-rooms.mjs  checks every room edge lines up with its neighbour
tools/make-icons.cjs   draws the app icons into icons/
tools/bot-check.cjs    plays the game with the autopilot over many seeds and reports hits
manifest.webmanifest   app name, icons, full screen and landscape
sw.js             offline cache for the installed app
```

After editing, run `node games/cinderdeep/tools/check-rooms.mjs` and `node games/cinderdeep/tools/build.mjs`.

## The autopilot

Choose **Watch it play itself** on the title screen, or open `index.html?bot` (`?bot&speed=2` plays twice as
fast). The autopilot plays with the same buttons you have and reads only what is on screen. It never moves the
Wick directly or touches health. It does not use your save.

- **Routes:** each room has a list of moves (walk to a point, jump onto a ledge, flicker across, drop through,
  rest, fight). Every move checks that it landed where it meant to. If not, the room's list starts again,
  skipping moves already done.
- **Look-ahead:** in a fight it picks what it wants to do (close in, strike, throw a cinder, keep away). It then
  simulates the Wick 0.8 s ahead for each choice of buttons, using the game's own movement and tile collision.
  It checks each path against the predicted paths of every enemy, glob, drip, shockwave and the boss's body and
  swipe, and presses the safe choice closest to what it wanted.
- **Counter-strikes:** moths and globs are struck out of the air when, struck now, they would meet the blade
  before reaching the Wick.

`node games/cinderdeep/tools/bot-check.cjs 1 20` plays seeds 1 to 20 headless, without drawing, and reports
for each run whether it finished, how many hits it took, and where. `?seed=N` makes a run repeatable.

## Debug

- `?debug` shows hitboxes, frame rate and script time.
- `?room=longdrip&dash=1` starts in any room (`wakefall`, `shaft`, `shrine`, `longdrip`, `antechamber`, `hall`,
  `threshold`). Add `&x=` and `&y=` in tiles to choose where.
