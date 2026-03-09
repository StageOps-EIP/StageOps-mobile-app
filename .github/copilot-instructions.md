# StageOps Mobile App – Copilot Instructions

Terrain app for lighting/sound/stage technicians. Offline-first React Native (Expo) app targeting devices with unreliable connectivity.

All source code lives in `apps/mobile/`. Run all commands from that directory.

## Commands

```bash
cd apps/mobile

npm start              # Expo dev server
npm run android        # Launch on Android
npm run ios            # Launch on iOS
npm run lint           # ESLint (0 warnings tolerance)
npm run lint:fix       # Auto-fix lint issues
npm run format         # Prettier write
npm run format:check   # Prettier check
npm run typecheck      # tsc --noEmit
```

No test runner is configured.

## Architecture

Layered, feature-based architecture under `apps/mobile/src/`:

```
src/
  app/          # App shell: providers, navigation, screens
  features/     # Domain features (dashboard, incidents, inventory, sync)
  infra/        # All I/O: SQLite DB, HTTP client, sync engine, logging
  shared/       # Pure cross-cutting: types, constants, utils
```

**Data flow:** Screen → `features/{name}/usecases/` → `infra/db/repos/` → SQLite (expo-sqlite)

### `app/`
- `AppProviders.tsx` – initializes SQLite, runs migrations, seeds, blocks render until ready
- `navigation/` – React Navigation: `RootNavigator` (native-stack) wraps `TabNavigator` (5 bottom tabs). Typed params in `navigation/types.ts`
- `screens/` – thin screen components, delegate logic to usecases

### `features/`
Each feature (`dashboard`, `incidents`, `inventory`, `sync`) has:
- `usecases/` – pure business logic, no UI imports
- `ui/` – feature-specific components

### `infra/`
- `db/` – SQLite layer: `db.ts` (query runners), `schema.ts`, `migrations.ts`, `seed.ts`, `repos/` (one file per entity)
- `api/` – `httpClient.ts` (axios, timeout/error handling), `syncApi.ts` (push/pull)
- `sync/syncEngine.ts` – state machine, bi-directional sync, exponential backoff
- `logging/log.ts` – tagged logger

### `shared/`
- `types.ts` – all domain models (`Equipment`, `Incident`, `OutboxEvent`, `SyncChange`, API contracts)
- `constants.ts` – `API_BASE_URL`, `SYNC_BATCH_SIZE`, backoff params
- `ids.ts`, `time.ts`, `validation.ts` – pure utilities

## Offline-First Sync

- **Outbox pattern**: writes go to SQLite immediately + enqueue an `OutboxEvent`; `syncEngine` flushes opportunistically
- **Upsert / last-write-wins**: conflicts resolved by `updated_at` timestamp
- **Soft deletes**: use `deleted_at`, never hard-delete rows
- **Batching**: 50 events/batch, exponential backoff with jitter (2 s → 5 min ceiling)
- Device identity: stable UUID persisted via `infra/sync/device.ts`

## Path Aliases

Configured in both `tsconfig.json` and `babel.config.js`:

| Alias | Resolves to |
|-------|------------|
| `@/*` | `src/*` |
| `@app/*` | `src/app/*` |
| `@features/*` | `src/features/*` |
| `@infra/*` | `src/infra/*` |
| `@shared/*` | `src/shared/*` |

Always use aliases over relative paths that cross layer boundaries.

## Conventions

- **Types**: PascalCase interfaces in `shared/types.ts` — define once, import everywhere
- **Constants**: SCREAMING_SNAKE_CASE in `shared/constants.ts`
- **Repos**: `{entity}Repo.ts` in `infra/db/repos/` — one file per entity, export plain functions
- **Usecases**: `{feature}Usecases.ts` — no UI imports, no direct DB calls (go through repos)
- **Screens**: `{Name}Screen.tsx` — thin, delegate to feature usecases
- **Unused args**: prefix with `_` (ESLint rule: `argsIgnorePattern: '^_'`)
- **No `console.*`** in `src/` — use `infra/logging/log.ts` instead
- Prettier: single quotes, 2-space indent, trailing commas, 100-char line width, `arrowParens: "avoid"`
- TypeScript strict mode is enabled
