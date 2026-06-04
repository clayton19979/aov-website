# Codex Ideas

This file is maintained by a Codex automation that runs every 2 hours.

Rules:
- Use `https://docs.evefrontier.com/` as the primary resource for what is possible in EVE Frontier.
- Write for non-technical readers. If you must use words like `on-chain`, `sponsored transaction`, or `extension contract`, explain them in plain English right away.
- Keep the list sorted from best idea to weakest idea. Re-rank the full list whenever you add something new.
- Add only new tool or application ideas for EVE Frontier.
- Do not duplicate existing ideas by title or by substantially similar concept.
- If the docs review does not uncover a genuinely new idea, leave the list unchanged.
- Do not modify other files in this repository as part of this idea-research job.
- Score each idea from `1-10` for `Usefulness` and `Difficulty`.
  - `Usefulness`: higher means more valuable to players, corps, logistics, industry, or operations.
  - `Difficulty`: higher means harder to build or maintain.

Entry format:

## Idea Name
- Usefulness: 0/10
- Difficulty: 0/10
- Source notes: Short note on the docs capability or mechanic that makes the idea possible.
- Summary: One paragraph describing the tool or application.
- Why it matters: Short explanation of the player or organizational value.
- Build notes: Short implementation plan or integration outline.

## Ideas

## Storage Unit Escrow Exchange
- Usefulness: 10/10
- Difficulty: 8/10
- Source notes: Based on Smart Storage Unit rules, custom storage extensions, and extension-to-owned delivery in the storage docs, plus read/write access through GraphQL, events, and transactions in the world interface docs.
- Summary: A trade app where a seller loads goods into a smart storage unit, the buyer pays through the app, and the system releases the items automatically when the deal is valid. In plain English, this is a safer player marketplace that uses the game's programmable storage rules instead of trust alone.
- Why it matters: This could become the backbone for corp supply stores, contractor payouts, alliance trade hubs, and player-run shops. It removes a lot of manual handoff work and lowers the risk of one side taking the money or the goods and disappearing.
- Build notes: Build a storage extension that can hold listings, payments, and delivery rules; pair it with a simple web app for browsing and checkout; and index storage and inventory events so players can track order status.

## Permit-Aware Route Broker
- Usefulness: 9/10
- Difficulty: 7/10
- Source notes: Based on Gate extensions, permit-based travel, toll checks, bounty or tribe requirements, linked-gate rules, and the world read/write patterns described in the gate and interface docs.
- Summary: A route planner that does more than show the shortest path. It would check whether a gate is public, toll-based, or locked behind custom rules, then suggest the best route based on time, price, and how likely a player is to actually get through.
- Why it matters: Travel in Frontier can turn into real business because gates can be controlled by players. A smarter route tool would help haulers, scouts, fleet organizers, and gate owners make better decisions instead of guessing which path will actually work.
- Build notes: Index gate links and extension metadata, estimate travel friction for each gate, offer route scoring by cost and access chance, and add optional permit-buying or toll-payment flows where the gate logic supports it.

## Mission and Reward Kiosk
- Usefulness: 9/10
- Difficulty: 7/10
- Source notes: Based on the Smart Infrastructure docs saying storage units can become quest kiosks and support missions and rewards, plus Storage Unit rules for gated deposits, item dispensing, and sending rewards straight into a specific player's own inventory.
- Summary: A job board where players or corps post delivery runs, scavenger hunts, or turn-in tasks and the system pays out automatically when the right item or proof is handed in. In plain English, it turns player contracts into self-running missions instead of trust-based promises in chat.
- Why it matters: Frontier should be at its best when players can create work for each other. This would let groups run mining incentives, border patrol rewards, newbie training jobs, or local event chains without a human manager manually checking every claim.
- Build notes: Use a smart storage unit as the turn-in point, attach custom reward rules to it, optionally tie some jobs to gate access or location checks, and provide a simple web app for posting jobs, tracking progress, and claiming payouts.

## Fleet Kit Dispenser
- Usefulness: 8/10
- Difficulty: 5/10
- Source notes: Based on Storage Unit support for gated access, temporary per-player holding space, and delivery from a storage rule set into a specific player's own inventory, including the docs examples of guild hangars and rewards.
- Summary: A corp supply tool that lets approved pilots claim prepacked ammo, fuel, ship parts, or full deployment kits from a base in a few clicks. Instead of waiting for a quartermaster to hand things out one by one, members could pick up the exact package they are allowed to use.
- Why it matters: Fleet form-ups and base defense both slow down when supplies are trapped behind one officer's schedule. This would make staging faster, reduce distribution mistakes, and keep a clear record of what has already been issued.
- Build notes: Load kits into a smart storage unit, define who can claim which package and how often, deliver the items into the player's own inventory, and show remaining stock and claim history in a simple web app.

## Item Bridge and Return Tracker
- Usefulness: 8/10
- Difficulty: 5/10
- Source notes: Based on Storage Unit docs saying items must be moved from normal game inventory into the programmable side of the game before storage tools can use them, and can later be returned back to the game, plus inventory events and GraphQL reads in the world interface docs.
- Summary: A simple tracker that shows which of a player's items are ready for player-made storage apps, markets, missions, or rewards, and which items still need to be moved back into the normal game. In plain English, it prevents players from losing track of goods that are sitting in the "app usable" version of inventory.
- Why it matters: Many useful Frontier tools depend on items being available to outside apps first. This would save traders, haulers, and quartermasters from confusion when an item is not where they expected it, and it would make storage-based services easier for normal players to trust.
- Build notes: Connect through EVE Vault, read the player's character and storage-related item events, show clear "in game", "ready for apps", and "returned" status labels, and add reminders for items that have been left in temporary storage too long.

## Base Fuel and Power Planner
- Usefulness: 8/10
- Difficulty: 5/10
- Source notes: Based on Network Nodes, fuel burn over time, fuel efficiency by fuel type, fixed energy output, and the rule that connected assemblies are forced offline when a node runs out of fuel.
- Summary: A dashboard that tells players how long each base can stay online, when refueling is needed, and which structures are at risk if a power node fails. Instead of making people read raw numbers, it would turn fuel and energy data into clear warnings and simple maintenance plans.
- Why it matters: Running out of fuel is not a small mistake. It can shut down everything connected to that node. This tool would save builders and logistics teams from surprise outages and help them plan fuel runs before a base goes dark.
- Build notes: Pull node and assembly data through GraphQL, estimate remaining uptime under the current fuel mix, compare alternate fuels, and send easy-to-read alerts to email, Discord, or a private ops page.

## Jump Traffic Heatmap
- Usefulness: 8/10
- Difficulty: 5/10
- Source notes: Based on Gate travel, `JumpEvent` event tracking, and the docs guidance to store and subscribe to world events off-chain for dashboards and analytics.
- Summary: A live map that shows which gates are busy, quiet, growing, or cooling off based on recent jump traffic. Think of it like a traffic report for Frontier travel lanes, but built from real game events instead of player rumors.
- Why it matters: Haulers could avoid crowded choke points, scouts could spot important movement lanes, and entrepreneurs could see where a new toll gate, market, or refuel stop would get the most traffic.
- Build notes: Collect jump events into a time-series index, group them by gate pair and time window, show the results on a map or ranked table, and optionally let players filter by time of day or region.

## Custom dApp Safety Checker
- Usefulness: 8/10
- Difficulty: 6/10
- Source notes: Based on the in-game dApp docs saying assembly owners can set custom URLs, those custom sites are independent of the CCP safe zone, and builder functions may require wallet transactions, plus dApp kit support for wallet connection, assembly data, notifications, and transaction handling.
- Summary: A safety tool that checks a custom assembly website before a player uses it. It would show who owns the assembly, where the link points, whether the site is asking for a wallet connection, and what action the player is about to approve in simple language.
- Why it matters: Custom websites can make Frontier much richer, but players need help knowing what they are clicking and signing. This would reduce mistakes, make player-built services feel safer, and help honest builders earn trust.
- Build notes: Read the assembly name, owner, state, and custom URL through the dApp tools, show a clear warning when a site is outside the official safe area, explain wallet prompts in plain English, and keep a public list of known trusted or risky service URLs.

## Turret Alarm and Target Tuner
- Usefulness: 8/10
- Difficulty: 6/10
- Source notes: Based on Turret docs for custom targeting rules, target details like ship class, aggressor status, and health, plus the builder docs around live world reads and Smart Infrastructure's defend, alert, and customize patterns.
- Summary: A defense dashboard that warns base owners when trouble enters range and lets them tune what their turrets care about most, such as attackers first, fragile ships first, or specific ship classes. In plain English, it is part security alarm and part "teach my guns what matters" control panel.
- Why it matters: Frontier defenses are programmable, which means the difference between a good setup and a bad one can be huge. This would help smaller groups react faster to raids and help larger groups standardize smarter base-defense behavior.
- Build notes: Pull turret status and target changes into a live dashboard, offer simple priority presets for different defense styles, and save those rules back into each turret's custom logic through a web app.

## Access and Permission Checker
- Usefulness: 7/10
- Difficulty: 6/10
- Source notes: Based on the ownership hierarchy in the docs, especially `OwnerCap`, `AdminACL`, sponsor checks, Smart Character keychain behavior, and PlayerProfile-based character lookup from a wallet address.
- Summary: A security report tool that shows who really controls which structures and which actions require special permission. In plain English, it answers questions like "Who can change this thing?" and "What breaks if this trusted wallet disappears?"
- Why it matters: Frontier ownership is more advanced than a basic username-and-password system. Corps and builders need a simple way to understand who has power over valuable structures before they hand out access or install new logic.
- Build notes: Resolve characters from wallet-owned profiles, inspect owned assemblies and their capabilities, flag sponsor-dependent actions, and produce a simple report with red, yellow, and green risk labels.

## Game ID Lookup Tool
- Usefulness: 7/10
- Difficulty: 7/10
- Source notes: Based on deterministic object identity from `TenantItemId`, the one-to-one mapping between game resources and on-chain objects, and the read paths described in the world interface docs.
- Summary: A lookup tool that turns a game-facing ID into the exact object a builder needs to inspect on the backend. In plain English, it helps developers and advanced toolmakers find the right thing fast instead of digging through raw queries and guessing.
- Why it matters: This would cut down debugging time for almost every serious Frontier builder. It is less visible to ordinary players than a market or route tool, but it could quietly speed up many other apps built on top of Frontier.
- Build notes: Ship a reusable lookup library plus a simple web UI, support searches by item ID, tenant, wallet, and character, and attach object state, related links, and event history once the object is resolved.

## Instant Assembly Site Builder
- Usefulness: 6/10
- Difficulty: 4/10
- Source notes: Based on dApp kit support for wallet connection, GraphQL smart-object reads, sponsored transactions, auto-polling, and URL-driven assembly resolution through `tenant` and `itemId`.
- Summary: A site generator that gives any Frontier structure its own public web page. A gate owner, market operator, or service builder could plug in an assembly ID and get a branded mini-site with wallet connect, public info, and buttons for the actions that assembly supports.
- Why it matters: A lot of Frontier ideas become more useful when they are easy to discover and use outside the game client. This makes it much cheaper to launch player services without hand-building a fresh frontend every time.
- Build notes: Build template-based pages on top of dApp kit, resolve assemblies from URL parameters, define reusable modules by assembly type, and support optional themes, analytics, and one-click transaction flows.
