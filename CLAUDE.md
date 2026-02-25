# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Divino** — A self-hosted home media server for streaming movies and TV shows to a Samsung Tizen TV. The backend transcodes media to HLS via FFmpeg; the frontend is a Tizen-compatible React app with TV remote navigation.

---

## Frontend Integration Workflow

**Before making any change to `api.ts` or any frontend fetch call**, read `swagger.json` at the repo root to verify endpoint paths, parameter names, and DTO shapes. Do not guess or reuse old URLs — always confirm against the spec first.

---

## Commands

### Backend (.NET 10)

Run from the repo root or any project directory:

```bash
dotnet build                      # Build all projects
dotnet run --project apps/MediaServer.Api  # Start API (port 5231)
dotnet test                       # Run tests
```

### Frontend (React + Vite)

Run from `apps/web-client/`:

```bash
npm run dev       # Vite dev server on localhost:5173
npm run build     # TypeScript check + production build (outputs to dist/)
npm run lint      # ESLint
```

Dev server must be started with `--host` to be reachable from the TV:
```bash
npm run dev -- --host
```

### Database Migrations

Run from the `scripts/ef-core/` directory. Scripts target `MediaServer.Infrastructure` (migrations project) and `MediaServer.Api` (startup project).

```bash
./migration-add.sh <MigrationName>   # Create new migration
./db-update.sh                        # Apply pending migrations
./db-revert-last.sh                   # Revert last migration
./migration-remove-last.sh            # Delete last migration file
./db-nuke.sh                          # Drop the entire database
```

### Tizen TV Packaging & Deployment

From `apps/web-client/`:

```bash
npm run build                                           # Build dist/
tizen package -t wgt -s author.p12 -- dist/           # Package as .wgt
tizen install -t <TV_IP>:26101 -n DivinoApp1.Divino.wgt  # Install on TV
sdb shell 0 debug DivinoApp1.Divino                    # Launch + get debug port
# Then open chrome://inspect in Chrome for Remote Web Inspector
```

---

## Architecture

### Backend: Clean Architecture + CQRS

```
apps/
├── MediaServer.Api/           ASP.NET Core controllers, middleware, entry point
├── MediaServer.Application/   Use cases: Commands, Queries, Handlers, DTOs, Validators
├── MediaServer.Domain/        Entities only (no dependencies)
├── MediaServer.Infrastructure/ EF Core DbContext, repositories, FFmpeg services
└── MediaServer.IOC/           DI wiring (all registrations in one place)
```

**Request flow**: Controller → `_mediator.Send(query/command)` → MediatR pipeline → Handler → Repository/Service

**MediatR pipeline behaviors** (apply to every request):
1. `LoggingBehavior` — logs request name + elapsed time
2. `ValidationBehavior` — runs FluentValidation validators; throws on failure

**Handlers return** `Result<T>` (from OperationResult NuGet package). Controllers unwrap this into `ResponseMessage<T> { isSuccess, result, errorMessage }` via `BaseController`.

### Domain Model

- `MediaItem` — core file entity (FilePath, OriginalFileName). Has many `SubtitleTrack` and `MediaProfile`. Referenced by `Movie` (1:1) or `TvShow` as episodes (1:many).
- `Movie` — metadata wrapper (Title, Description, PosterPath) with a single `MediaItem`.
- `TvShow` — series container with a list of `MediaItem` episodes.
- `MediaProfile` — a transcoded rendition of a `MediaItem` (used for HLS output tracking).
- `SubtitleTrack` — VTT subtitle file (Language, FilePath) attached to a `MediaItem`.

### Streaming Pipeline

1. Client calls `POST /api/streaming/hls/start/{id}` → `StartHlsStreamCommand` → `FFmpegTranscodeManager` starts FFmpeg
2. FFmpeg outputs `.ts` segments + `.m3u8` playlists to `.transcoded_{mediaId}/` next to the source file
3. Client loads `GET /api/streaming/hls/master/{mediaId}.m3u8` into Shaka Player
4. Segments served at `GET /api/streaming/hls/{mediaId}/{fileName}`
5. Direct-play fallback available at `GET /api/streaming/{id}` (range requests supported)

### Frontend

**Routing** (`App.tsx`, using `HashRouter` — required for Tizen packaged apps):

| Path | View |
|------|------|
| `/` | `Catalog` — grid of all movies/shows |
| `/movie/:id` | `MovieDetails` — poster + play button |
| `/show/:id` | `ShowDetails` — episode list |
| `/play/:mediaId` | `Player` — full-screen Shaka player |
| `/admin` | `AdminPanel` — subtitle management |

**`api.ts`** — all fetch calls go through here. Base URL from `VITE_API_URL` env var (defaults to `http://localhost:5231/api`). All endpoints return `BaseResponse<T> { isSuccess, result, errorMessage }`.

**`useKeyNav` hook** — generic keyboard/remote navigation. Takes `count`, `columns` (1=list, N=grid), `onSelect`, `onBack`, `initialIndex`. Returns `activeIndex`. Scrolls `nav-item-${index}` elements into view automatically.

**Player state machine** (`Player.tsx`) — three control modes for TV remote usability:

| Mode | Arrow behavior |
|------|---------------|
| `playback` (default) | ←/→ seek ±10s; ↑ enters controls; Enter = play/pause; Back = navigate(-1) |
| `controls` | ←/→ move focus across 7 buttons (0=Back, 1=↺10, 2=▶, 3=10↻, 4=CC, 5=🔊, 6=⛶); ↓ exits; Enter activates |
| `subtitle-menu` | ↑/↓ navigate list; Enter selects; ← closes |

`showControls()` starts a 4s auto-hide timer. `showControlsPersist()` keeps controls visible without a timer (used while navigating controls or subtitle menu).

---

## Configuration

### Backend

`apps/MediaServer.Api/appsettings.Development.json`:
- `PostgresSettings` — host, port, user, password, database
- `ScannerSettings.LibraryPaths` — array of directories to scan for media files
- `ScannerSettings.SupportedExtensions` — `[".mkv", ".mp4", ".avi"]`

API must bind to `0.0.0.0` (not `localhost`) to be reachable from the TV — set in `Properties/launchSettings.json`.

### Frontend

`apps/web-client/.env.local` (create manually, not committed):
```
VITE_API_URL=http://<server-LAN-ip>:5231/api
```

### Tizen App

`apps/web-client/public/config.xml` — Tizen widget manifest. **Do not add an `<?xml` declaration** — Tizen's Java XML parser rejects it. The app ID is `DivinoApp1.Divino`. Signing cert is at `certs/samsung/author.p12`.

---

## Key Gotchas

- **HashRouter is mandatory** — Tizen packaged apps open at `/index.html`, which breaks BrowserRouter (`No routes matched location "/index.html"`).
- **TV remote "Back" key** maps to `keyCode 10009` (not a standard key name). All back-navigation handlers must check `e.keyCode === 10009`.
- **Subtitle loading** requires calling `player.addTextTrackAsync()` and then `player.selectTextTrack()` with the matching track — Shaka does not select automatically.
- **EF migrations** use `--project` (Infrastructure) + `--startup-project` (Api) — the scripts handle this correctly; run them instead of bare `dotnet ef` commands.
