# Design Prompt: Online Co-op First-Person Horror Game

You are an experienced game developer. Help me build a browser-based cooperative first-person horror game for 2–5 players over the network. Guide me step by step, explain in simple language (I can barely code), and after each stage give exact instructions on how to run and test the result.

## Core Concept

A group of players is trapped in a dark, enclosed place (abandoned hospital / bunker) and must work together to complete objectives (e.g. find and activate 3 items to open the exit) while an entity roams the level. The game's signature mechanic is that reality is distorted differently for each player:

- One player sees a monster where a chair is, while for everyone else it's just a chair.
- The sound of footsteps/whispering is heard by only one person, while others are sure it's silent.
- A hallway warps or "breathes" for one player, but looks normal to the others.
- Sometimes a player sees a "phantom" of a teammate who isn't actually there.

This creates panic and distrust ("is it just me, or is something really there?!"). The real danger (the entity) is shared by everyone and can actually "catch" a player, but hallucinations mask it, so it's unclear what's real.

Atmosphere: sharp jumpscares and panic. Long tense quiet → a sudden loud jumpscare (harsh sound + flash + entity in your face).

## Tech Stack (use exactly this for simplicity)

- Client: Three.js (first-person 3D), plain JavaScript + Vite.
- Server: Node.js + Express + Socket.IO (rooms, player sync).
- One server serves both the game and the sockets — so there's only one thing to deploy.
- Audio: Web Audio API. Loop a background ambient drone from `/public/audio/ambient/` (a file `ambient_ethereal.wav` is already provided there). Use sharp loud "stingers" for jumpscares from `/public/jumpscares/sounds/` (provided). Positional audio for the entity's footsteps. Play "hallucination voice" clips from `/public/audio/hallucinations/` (provided) to only one player at a time.
- No heavy assets: simple low-poly geometry, dark textures, fog, and a player flashlight — that's enough to be scary.

## Gameplay Core

1. Lobby: the host creates a room and gets a 6-digit code. Friends enter the code and join (max 5). The host presses "Start".
2. First-person: WASD + mouse controls (pointer lock), player flashlight (picked up at the very start — see "Items and Inventory"), limited visibility, subtle camera bob while walking.
3. Network sync: the server holds the "true" state (player positions, entity position, collected items). Clients send their movement and receive everyone else's positions. Smooth interpolation of other players.
4. Hallucination system (most important): the server decides who has which hallucination active and sends it ONLY to that player. The client renders the hallucination as an overlay on top of the real world. Hallucinations should snap in sharply and abruptly (sudden appearance, hard flicker, instant swap) rather than fading in slowly — the suddenness is what scares. Types: swapping an object for a monster, a fake sound (play a random clip from `/public/audio/hallucinations/` — provided — to ONLY that one player, so they hear a voice in an empty room while others hear nothing), geometry/shader distortion (walls "breathing", colors drifting), a phantom player. Hallucinations intensify when a player is alone or the entity is near.
5. The entity: an AI monster patrols the level, reacts to light/noise, and chases players. When it catches someone — a jumpscare and the player "goes down" (becomes a spectator or must be rescued — your call, propose an option).
6. Goal: each level has its own set of objectives (see the "Objectives and Progression" section). Players win if they complete the objectives and escape; they lose if everyone is caught.
7. Jumpscares: a manager that builds up tension and, at the right moment, triggers a sharp, sudden jumpscare — a fullscreen image snapping in for a split second + a harsh loud sound + screen shake/flash. It must be abrupt, never a slow fade. Keep them spaced out so they stay effective, and escalate frequency on harder levels.
   - Customizable jumpscare pack: load jumpscare images and sounds from a dedicated folder (`/public/jumpscares/` for images and `/public/jumpscares/sounds/` for sounds) so I can drop in my OWN images and sounds — including meme-style scares. I have already prepared a set of scary meme images in `/public/jumpscares/` and scare sounds in `/public/jumpscares/sounds/` — use every image found there, and pair each scare with a random sound from that sounds folder. The game should pick one at random each time. Make it dead simple: if I add a new image + sound file to that folder, it gets used automatically. If the folder is empty, fall back to 1–2 built-in placeholder scares so it still runs. Tell me exactly where to put my own files and what formats to use (.png/.jpg for images, .mp3/.wav for sounds).

## Objectives and Progression

One match lasts about 15–30 minutes. The game should be replayable, not a one-off story. Make it so:

Structure: several mission-levels (start with 3) with escalating difficulty — the further you go, the more hallucinations, the faster and more aggressive the entity, the darker the level. Also lay the groundwork for a random-round mode (randomized item and objective placement) so it can be replayed endlessly.

Objective types (combine 2–3 per level):

1. Collecting in the dark — find N items scattered around the level.
2. Repair/activation — fix generators or fuse boxes: while repairing, the player stands still and is vulnerable, so others must cover them.
3. Co-op puzzle with deception — a door code where, due to hallucinations, each player sees DIFFERENT digits. Players must discuss and figure out who's "glitching" to enter the correct code. This is the key mechanic — tie it to the hallucination system.
4. Ritual — place items in the correct spots based on clues (the clues can lie too).
5. Final escape — once all objectives are done, the entity goes berserk and the group must run to the exit together.
6. Rescuing a teammate — a downed player can be revived by allies within a limited time, otherwise they're out for good.

Win/lose conditions: win — complete all level objectives and escape; lose — the entity catches everyone. Show overall objective progress in the UI (e.g. "Items: 1/3", "Generators: 0/2").

## Items and Inventory

Each player has a personal inventory shown in the UI (item icons/slots). Items are picked up by walking up to them and pressing E (show a pickup prompt and a short sound; the item then appears in the inventory).

- Flashlight (mandatory): every player picks up a flashlight at the very start of each match — it's the first thing you grab (e.g. from a starting table/locker). Without it you can barely see anything. The flashlight has a draining battery, and spare batteries can be found around the level; when the light dies, panic spikes.
- Keycards: open locked doors and restricted areas. Use different colors/tiers for different doors (e.g. blue card → storage, red card → exit).
- Passwords / codes: found as notes, on terminals, or scrawled on walls; used to unlock doors and terminals. Tie these into the deception mechanic — hallucinations can make a player read the WRONG digits, so the team must compare what each of them sees to find the real code.
- Objective items: items needed to complete tasks (fuses for generators, ritual objects, the exit key, etc.).
- Co-op depth (optional but nice): players can hand items to each other or drop them, so the team can split who carries the flashlight, the keycard, and the objective items.

Tie the inventory directly into the objectives: e.g. find the fuse → repair the generator → power the door → use the keycard + code to open it → escape.

## Art Direction

Dark corridors, thick fog, a flickering flashlight beam, minimal color. Simple geometry, but proper lighting and sound matter more than detail.

## How to Work

Build incrementally and testably — don't try to do everything at once:

- **Stage 1**: project skeleton (server + client), an empty Three.js room in first-person with movement, and a flashlight the player picks up (press E) at the start. Runs locally.
- **Stage 2**: lobby with a room code and joining for 2–5 players, network movement sync.
- **Stage 3**: first location (level), fog, ambient sound, inventory + pickup system (flashlight, keycards, codes, objective items), and the objective and progress system (start with item collection and generator activation, show progress in the UI).
- **Stage 4**: the entity and its AI + catching a player.
- **Stage 5**: the hallucination system (individual per player).
- **Stage 6**: jumpscares (sharp fullscreen meme-style scares loaded from a customizable folder) and polishing sound/atmosphere.

After each stage: show me how to run it (`npm install`, `npm run dev`, etc.), what I should see, and wait for my confirmation before the next stage.

## At the End

Give step-by-step instructions on how to publish the game online for free (e.g. on Render or Railway) so friends on other computers can join via a link and a room code. Explain it as if I'm doing it for the first time.

---

**Progress log:**
- ✅ Stage 1 — done (project skeleton, first-person movement, flashlight pickup).
- ✅ Stage 2 — done (nickname + Roblox-style lobby, 6-digit room codes, waiting room
  with colored avatars/host tag, network movement sync, in-game name tags that
  billboard toward the camera, corner alive/eliminated player list).
- ✅ Stage 3 — done (fog-filled level, ambient audio hook, inventory bar, 3
  collectible items + 2 repairable generators with a stand-still timed repair,
  objectives progress panel, exit door that visually unlocks on completion).
- ✅ Stage 4 — done (server-authoritative entity: patrols waypoints, detects
  players by proximity with bonuses for an on flashlight and for moving,
  chases and catches within range. Caught player is frozen with a red
  "ВАС ПОЙМАЛИ" overlay; other clients see them dim in the HUD and in 3D.
  All-caught triggers a lose toast. Chose "frozen spectator" over "rescue"
  for the catch outcome, per the prompt's "your call" on this mechanic).
- ✅ Stage 5 — done (server decides who hallucinates and sends it only to
  that socket, more often when alone or the entity is near: a fake monster
  snaps into view near you for a few seconds, a phantom teammate who isn't
  really there, walls "breathe" via camera FOV pulsing + a hue/contrast
  filter, or a whisper plays only for you from public/audio/hallucinations/
  — auto-discovered via a server endpoint, any filename works, no files yet
  means that one type silently no-ops).
- ✅ Real monster model swapped in — user supplied `monster.glb` (a Draco-
  compressed werewolf), used for both the real entity and the "object-swap"
  hallucination in place of the placeholder capsule. Had to add DRACOLoader
  (the file uses Draco mesh compression), strip a display-pedestal mesh the
  source file included, auto-scale/recentre/ground it, and bump light
  intensities — Three.js r155+ uses physically-correct light units, so the
  old placeholder intensities (~6) were nearly invisible. See CREDITS.md for
  the model's CC-BY-4.0 attribution.
- ✅ Multi-level progression — objectives/inventory moved server-side (a
  real co-op fix: previously each client tracked items/generators locally,
  so a teammate's pickup didn't disappear for anyone else). `levels.js` (repo
  root, imported by both client and server) defines 3 levels sharing the
  same room shell, each escalating item/generator counts, entity speed, and
  hallucination frequency. Reaching the unlocked exit door and pressing E
  advances everyone in the room to the next level (fresh entity, fresh
  objectives, un-eliminates caught players); finishing level 3 broadcasts a
  win. Room enlarged (16×22 → 22×30) with a checkered floor texture and
  scattered clutter props (gurneys/cabinets/debris/ceiling lamps) for
  atmosphere. Added sprint (Ctrl, 1.7×, reported to the server as extra
  "noise" for entity detection) and brightened the flashlight substantially
  (Three's physically-correct lighting made the earlier value too dim) plus
  ACES tone mapping so close-range light doesn't clip to flat white.
- ✅ Non-emissive pickups/generators — items and the generator's status light
  were self-illuminated (emissive), making them visible as glowing beacons
  even without a flashlight. Switched both to plain non-emissive materials
  per the user's request, so finding them actually requires searching in
  the dark with a light source.
- ✅ Real furniture pack — user supplied a set of hospital-themed CC-BY-4.0
  models (gurney, wheelchair, morgue cabinet, hospital cupboard, crutch + IV
  drip, a fluorescent light fixture, rusted double doors, a standing
  "corpse"/silent figure, a paper stack) replacing the earlier procedural
  box-shaped clutter. Also received a "surgery set" prop (CC-BY-NC-SA-4.0 —
  non-commercial only, flagged in CREDITS.md) and skipped one "papers" model
  with a non-free Sketchfab Standard license in favor of a CC-BY alternative
  the user also provided. Notable debugging detour: raw glTF accessor bounds
  (read directly from the binary JSON chunk) do NOT reflect a mesh node's own
  transform, so trusting them to guess "wrong up-axis" fixes was actively
  wrong for every model in this pack — all of them were already correctly
  oriented by GLTFLoader with zero extra rotation needed.
- ✅ Stage 6 — jumpscares: server picks who gets scared (rare, spaced-out
  random ticks that scale with level + a guaranteed one on catch) and pushes
  a personal `jumpscare` event; client shows a fullscreen image (instant, no
  fade) + screen-shake + loud sound, sourced from `/public/jumpscares/` and
  `/public/jumpscares/sounds/` (auto-scanned, same pattern as hallucination
  sounds). Both folders were still empty (only READMEs) despite the original
  spec text claiming files were "already prepared" — added a couple of
  built-in emoji placeholders so it still works out of the box; user can drop
  real .png/.jpg + .mp3/.wav files in at any time with no rebuild needed.
- Also fixed: the hallucination "fake monster" silhouette wasn't rotated to
  face the player (unlike the real entity), which read as broken/janky —
  now faces the viewer like the real one. Replaced the plain capsule used
  for other players with a simple jointed humanoid (head/torso/arms/legs)
  that has a basic walk-swing tied to movement speed, since no rigged
  player-character model has been supplied yet.

## Addendum: nickname + lobby system (added after Stage 1, folded into Stage 2)

Add a nickname and lobby system to the game, similar to Roblox:

1. **Nickname Input.** Upon entering the game, the player should see a screen to
   enter a nickname (up to 16 characters). The nickname must be saved for future
   sessions.
2. **Lobby.** After entering the nickname, two buttons appear: "Create Room" (the
   player becomes the host and gets a 6-digit code to share with friends) and
   "Join Room" (to enter a friend's code). Inside the lobby, there is a waiting
   room with a list of all connected players' nicknames. Each player has a
   distinct colored dot/avatar, the host is clearly marked, and the status says
   "Waiting for players...". Max capacity is 5 players. The "Start" button is
   only visible to the host and becomes active when at least 1 other player
   joins.
3. **In-Game Nicknames.** During the match, the nickname floats above each
   character. The name tag must always face the camera (billboard style) and
   remain visible in the dark at close and medium ranges. Each player is
   assigned a unique color for easy identification. In the corner of the
   screen, there should be a small player list showing who is alive and who is
   eliminated.
