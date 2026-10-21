# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

District Stock is an Expo / React Native app (Android-first, package `com.districtstock.app`) for managing event and warehouse inventory. It also includes a single-file Node API (`server.js`) that runs on Render and is backed by Supabase Postgres. The code is plain JavaScript: there is no TypeScript, no test suite and no lint config.

## Commands

```bash
npm install
npx expo start                 # Metro dev server (Expo Go / dev client)
npx expo start --web           # web target (react-native-web)
npx expo run:android           # local native build (generates /android, which is gitignored)
npx expo install <pkg>         # always use this instead of npm add (SDK-compatible versions)
npx expo-doctor                # dependency/config diagnostics
npx eas-cli@latest build -p android --profile preview      # internal APK (see eas.json)
npx eas-cli@latest build -p android --profile production   # AAB
node server.js                 # API server on :10000 (works with no env vars; DATABASE_URL / SUPABASE_POOLER_REGION optional; needs `npm i pg`)
node scripts/setup_supabase.js # creates the Postgres schema (CREATE TABLE IF NOT EXISTS)
```

There are no tests or linters to run. To verify a change, run the app.

## Rules carried over from AGENTS.md (owner's mandatory rules)

- **Role tabs are locked.** Don't change which tabs each role gets:
  - Admin and Operations Manager: Dashboard, Reports, Master, User Setup
  - Warehouse and Event ground users: Dashboard, Movement, Reports, Stock
  - Event Planner: Dashboard, Raise Requests, My Requisitions

  The source of truth is `src/navigation/roleTabsConfig.js`.
- **Never auto-insert mock, sample or dummy records** into products, inventory, movements, warehouses, requisitions or users. Users enter all operational data themselves.
- **Preserve existing layouts, styles and formatting.** Avoid unrequested UI changes.
- **Check Expo docs before using an API.** Look up the exact SDK version (`expo` ~57) at `https://docs.expo.dev/versions/v57.0.0/` before touching Expo or React Native APIs; don't rely on memory.
- **APK delivery rule.** AGENTS.md says to build a release APK after each change and copy it to fixed `C:\Users\Testing\...` paths. That rule was written for the owner's Windows machine and `gradlew.bat`, so check with the user before following it anywhere else.
- **Expo Router doesn't apply.** AGENTS.md mentions Expo Router and `src/app/`, but this project doesn't use Expo Router (see Navigation below). Don't migrate to it unless asked.

## Architecture

### Navigation (no router library)
- `App.js` switches between top-level screens with a `currentScreen` state: `splash`, `login`, `forgot-password`, `reset-password` and `dashboard`.
- `MainAppContainer` renders the tab screens. It calls `getTabsForRole(session.role)`, which matches role strings loosely (substrings like "warehouse", "planner", "event", "operation", "admin") and **falls back to Admin tabs** when nothing matches.
- Sub-flows open as full-screen modals or state toggles inside a tab, not as routes. For example, the `Create*Screen` components are rendered by `MovementTabScreen`, and `AvailableDamageScreen` by `StockTabScreen`.

### Data layer: in-memory singletons plus file vaults plus cloud sync
All state lives in singleton services in `src/services/`. Screens read from them with getters and subscribe for updates.

| Service | Storage file | Holds |
|---|---|---|
| `authService` (object) | `district_stock_users_v1.json`, `district_stock_session_v1.json` | users DB, current session, selected dashboard warehouse |
| `masterService` (class) | `district_stock_master_v1.json` | products, warehouses, events, categories, productTypes, requisitions, stockActionLogs, reportsHistory, scheduledReports |
| `inboundService` | `district_stock_inbound_v1.json` | inbound consignments (lifecycle Draft → Generated → In Progress → Completed / Canceled) |
| `movementService` | `district_stock_movements_v1.json` | `{ outbounds, transfers, returns }` |
| `carrierService` | `district_stock_logistics_carriers_v1.json` | carrier and transporter name lists |

- **Saving.** A service's `persist()` calls `storageHelper.writeData()`. That writes the same JSON to five "vaults" (document dir, `vault_` copy, `/storage/emulated/0/Download|Documents/DistrictStock_Data/`, and the cache dir). It then fires `cloudSyncService.pushCollection()` in the background. The collection is chosen from the filename by substring (`user` → users, `inbound`, `movement`, `master`, `carrier`/`logistic`).
- **Anti-wipe shield.** `writeData` refuses to overwrite non-empty master arrays (warehouses, products, events, requisitions) with empty ones, and it merges users when the new list has one entry or fewer. As a result, deleting the *last* item of those collections doesn't stick.
- **Startup sync.** At bootstrap and whenever the app returns to the foreground, `App.js` runs `storageHelper.syncWithCloud()` and then each service's `init(true)` (auth, master, inbound, movement, carrier all honour `forceReload`). `cloudSyncService.syncAll` fetches each collection **first**, then reads local data, merges the two with `mergeLists`, writes the result locally and pushes it back. Fetching first keeps the read-merge-write window tiny, so a change made during the network call isn't overwritten. `mergeLists` is a union keyed by id-like fields, and on a key collision the cloud fields win. The master blob's extra lists (`categories`, `productTypes`, `stockActionLogs`, `reportsHistory`, `scheduledReports`) are merged too; if they weren't, a fresh install would push them back empty and wipe them in the cloud.
- **Deletes never propagate.** Both the client merge (a union) and the server (upserts only) re-create deleted records. An item deleted locally comes back after the next sync. Fixing it needs tombstones across every entity type; it has not been done.
- **Every master mutation calls `persist()`**, including requisitions, categories, product types, damage/available logs, reports and schedules. A new mutator must do the same or its change is lost on restart.
- **Cross-service side effects.**
  - When a warehouse is active, created or renamed, `masterService` auto-links it to every Admin's `assignedLocations` (and unlinks it on deactivate or delete). Events are linked to Event Planners the same way.
  - `inboundService` adds `availableQty` to master products when an inbound reaches Completed.
  - Outbound, transfer and return movements never change stock.
- **Location scoping.** `locationScopeHelper.js` derives a user's accessible warehouses and events from active master records plus `session.assignedLocations`. Admins see everything. Dropdowns for analytics show "All …" only when there's more than one location; movement forms never do.

### expo-file-system API version (important)
In SDK 57 the path-based API (`getInfoAsync`, `readAsStringAsync`, `writeAsStringAsync`, `makeDirectoryAsync`, `deleteAsync`, `documentDirectory`, `cacheDirectory`) **only works when imported from `'expo-file-system/legacy'`**. From the main `'expo-file-system'` entry the functions throw on every call and `documentDirectory` is `undefined` (verified in the package source, `src/legacyWarnings.ts`). `storageHelper`, `authService` and `excelReportGenerator` now import `expo-file-system/legacy`. Because `storageHelper` catches every error, a wrong import fails silently and the app simply keeps nothing on disk. That was the original cause of "data disappears on restart". Any new file code should use `expo-file-system/legacy` or the `File`/`Directory`/`Paths` classes, never the main entry's old function names.

### Authentication (client-side only)
- `authService.authenticate` checks credentials against the local users DB. It uses a hand-rolled SHA-256 with one fixed global salt, and also accepts hardcoded default passwords.
- `authenticateAccessCode` (used by ground roles) logs in **with the access code alone**, for any active user. Ground codes are `DS` plus 3 digits, so there are only 1,000 possible codes and no attempt limit.
- `authService.deleteUser` filters with `a && b && c && d` across id, userId, accessCode and email, so it also deletes every user missing any of those fields, not just the target.
- `isSelectedUserSuperAdmin` in `UserSetupTabScreen` returns true for every `role === 'admin'` account, so no Admin can ever be deleted from the UI.
- The session is a random string saved to the session file, valid for 8 hours. After login, `syncSessionWithBackend` POSTs to `/api/auth/login`, which issues JWTs **without verifying any password**.
- Editing a password in User Setup stores a plaintext `password` field. `passwordHash` doesn't change, so the new password doesn't work.
- Forgot/Reset Password screens are UI-only (`setTimeout`, no backend).
- The seeded super admin (`super.admin@district.com`) is always re-added if it's missing.

### Backend (`server.js`)
- It's a raw `http` server with no framework.
- Routes:
  - `/health`, `/api/ping`
  - `/api/auth/login|refresh|session`
  - `GET`/`POST /api/sync/all`
  - `GET`/`POST /api/sync/:collection`
- **The sync routes don't check auth.** The owner has accepted this for the MVP. The collection name is checked against a whitelist (`SYNC_COLLECTIONS`) before it reaches SQL.
- **The database is the only source of truth, and failures are reported.** `getFromDb` and `saveToDb` never fall back to local files. A failed read or write throws, and the route answers 503 (database unreachable), 400 (malformed payload) or 500, with `success: false`. A save runs in one transaction. A single record the database rejects (for example a duplicate `code`) is rolled back to a savepoint and listed in the response's `failed` array, so the rest of the batch still saves. `GET /health` does a live `SELECT 1` and reports `databaseConnected`, `databaseVia` and `databaseError`, so check it first when data isn't saving.
- **Connection.** The "direct" host `db.<ref>.supabase.co` has only an IPv6 address, and Render only makes outbound IPv4 connections, so it can never connect from Render. That is why every save used to fail silently. `toPoolerUrl()` derives the Supabase **Session pooler** address (`aws-0-<region>.pooler.supabase.com:5432`, user `postgres.<ref>`) from `DB_URL` and `connectDatabase()` tries it first, then the original URL; set `SUPABASE_POOLER_REGION` if the project region isn't `ap-southeast-1`. A background timer retries every 30 s until connected.
- **Payload shapes.** `master`, `movements`, `logistics` and `carriers` are posted as one object and stored as a JSONB blob in `public.master` (keys `master_data`, `movements_data`, `logistics_data`), plus per-record rows for master's lists and for movements. Other collections are lists of records stored as rows (full record in `raw_data`). Reads merge the blob with the rows via `mergeUnique`. Writes are upserts only. An earlier version of the single-collection POST route threw away object payloads for movements and logistics, so they never saved. If you touch that route, keep the `OBJECT_COLLECTIONS` branch.
- **Testing without touching live data.** `server.js` exports `saveCollection`, `getFromDb` and friends and only listens when run directly (`require.main === module`). To test a save against the real database, call `saveCollection` on a client inside `BEGIN … ROLLBACK`. Don't POST test records to the live API without asking the owner.
- Config falls back to hardcoded credentials (`DB_URL`, `JWT_SECRET`, the Supabase keys) when environment variables are missing. The owner has said to leave them as they are for this MVP and not to rotate or harden them.

### Screens and components
- Screens are very large single files (2–4.6k lines each) that mix UI, form state and business logic, with `StyleSheet` at the bottom. Edit them surgically.
- `CreateInboundScreen` talks to `inboundService` directly. The Outbound, Transfer and Return create screens instead return their record through `onSave*` callbacks, and `MovementTabScreen` writes it to `movementService`.
- Shared UI: `DistrictTopHeader` (shown on every tab), `RoleBottomNavigation`, `TwoPartLocationPicker` (warehouse/event picker), `SearchableDropdown`, `CommonCalendarModal` (also exports `formatCalendarDate` and `parseDateInput`), `TablePagination` (10 rows per page).
- Theme colours are in `src/theme/colors.js`, though many screens hardcode hex values (primary purple `#5213C2`, dark `#160D33`).
- **Movement flows have gaps.**
  - `MovementTabScreen` has its own second putaway/status implementation (`handlePutawayQtyChange`, `handleCompleteAllPutaway`) that writes through `inboundService.updateInbound`. This bypasses `recordPutaway`, so it skips its checks and never calls `masterService.addInboundStock`. It also writes status `'COMPLETED'` (upper case) where the service uses `'Completed'`.
  - Tapping an inbound number opens `CreateInboundScreen`. For outbound, transfer and return rows it opens the detail modal, which shows inbound-only wording ("Putaway & Receiving Items", "Complete Putaway") for those records.
  - A saved outbound, transfer or return draft can't be reopened in its Create screen (`editingOutbound`, `editingTransfer` and `editingReturn` are never passed). Only reference, source and destination can be edited inline.
  - Created records get fixed statuses (outbound `Dispatched`, transfer `In Transit`, return `Inspected`), and nothing moves them further. There's no receive step at the destination.
  - Outbound and transfer never check available stock. Return doesn't check the returned quantity against the original outbound. A new return form pre-fills its first line with `masterProducts[0]` and quantity 1.
  - Movement numbers end in a random 3-digit suffix (`OUT-2026-123`), so they can collide.
- **Stock screens.**
  - `AvailableDamageScreen` falls back to `masterProducts[1] || masterProducts[0]` when a scanned code matches nothing, so a bad scan silently selects the wrong product. Its initial selection is also `masterProducts[1]`.
  - `StockTabScreen` only lists the last 5 damage/available logs, not stock levels.
  - Log timestamps are hardcoded to `', 10 Oct 2026'`.
- **Requisitions.**
  - Statuses only ever become `In Review`, `Approved` or `Rejected`. Nothing sets `Fulfilled` or `Partially Fulfilled`, though My Requisitions filters and counts them.
  - `MyRequisitionsTabScreen` lists every planner's requisitions, not the logged-in planner's.
  - Requisition IDs are sorted as strings.
  - The phone number `9820198201` and name `Sneha Patil` are hardcoded defaults.
- **Reports are largely fabricated.** `excelReportGenerator` ignores the selected date range and warehouse (they only appear in the file header). Inventory rows invent opening stock (+15), received (30), outbound (15) and reserved (8). Movement, task, return and requisition reports contain hardcoded demo rows. `ReportsTabScreen` also hardcodes "today" as 2026-10-16 and defaults the range to 2026-07-01 to 2026-10-11.
- **Seeded data.** `masterService`'s constructor creates five categories (Electronic, Books, Test, Furniture, Lighting) and two product types. The product form's default category is `'Electronics'`, which matches none of the seeded names.
- **Dead or unreachable code:**
  - `src/screens/DashboardScreen.js` and `src/components/EmptyStateCard.js` aren't imported anywhere.
  - `RequestsTabScreen` (which is where requisitions get approved) and `RoleHeader` are only reachable through a `requests` tab key, and no role has that tab.
- **Placeholder data the app still shows:**
  - `DashboardTabScreen` KPIs and lists are hardcoded to `0` and `[]`.
  - `excelReportGenerator` mixes real products with hardcoded demo rows ("Portable Speaker", "Event Banner"), and it exports CSV, not real Excel.
  - `masterService.generateReport` uses random record counts and file sizes.
  - "Upload document" in `MovementTabScreen` attaches a random fake filename.
  - Several forms fall back to fixed literal dates such as `'10 Oct 2026'` and default names such as `'Sneha Patil'`.

  These conflict with the no-mock-data rule. Replace them with real data rather than adding more.

### ID generation caveats
- Product IDs are `PRD-${products.length + 1}`, and requisition and category IDs use the same pattern. They collide after a delete, and because sync merges by `id`, a collision silently merges two different records.
- Inbound numbers (`INB0001…`) are sequential per device, so two devices can generate the same number.
- Movement numbers use random three-digit suffixes.
