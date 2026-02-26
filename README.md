# Divino

A self-hosted home media server for streaming movies and TV shows to a Samsung Tizen TV (or any modern browser). The backend transcodes media to HLS via FFmpeg; the frontend is a Tizen-compatible React app with full TV remote navigation.

---

## Features

- Stream `.mkv`, `.mp4`, and `.avi` files from your local library
- Automatic HLS transcoding via FFmpeg (multi-quality)
- Movie and TV show catalog with poster art
- Per-media subtitle management (upload `.srt` / `.vtt`, auto-converted to VTT)
- Transcode progress tracking in the UI
- Admin panel: add movies, create and edit TV shows, manage the media library
- Full TV remote navigation (Samsung Tizen remote, D-pad, Back key)
- Direct deployment to Samsung Tizen TV as a packaged `.wgt` app

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | ASP.NET Core 10, C# |
| Architecture | Clean Architecture + CQRS (MediatR) |
| Database | PostgreSQL + Entity Framework Core 10 |
| Video | FFmpeg (HLS transcoding), Shaka Player 5 |
| Frontend | React 19, TypeScript, Vite |
| TV Platform | Samsung Tizen 3+ |

---

## Prerequisites

Install the following on your server machine (the machine that holds your media files):

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Node.js 20+](https://nodejs.org/) (for the web client)
- [PostgreSQL 15+](https://www.postgresql.org/download/)
- [FFmpeg](https://ffmpeg.org/download.html) — must be on `PATH`

Optionally, to deploy to a Samsung Tizen TV:

- [Tizen Studio](https://developer.tizen.org/development/tizen-studio/download) (includes the `tizen` and `sdb` CLI tools)

---

## Setup

### 1. Clone the repository

```bash
git clone <your-repo-url> divino
cd divino
```

### 2. Create the PostgreSQL database

```sql
CREATE USER admin WITH PASSWORD 'password';
CREATE DATABASE home_media_server OWNER admin;
```

Or adjust the credentials to match your existing setup — you will configure them in the next step.

### 3. Configure the backend

Edit `apps/MediaServer.Api/appsettings.Development.json`:

```json
{
  "PostgresSettings": {
    "Host": "localhost",
    "Port": 5432,
    "User": "admin",
    "Password": "password",
    "Database": "home_media_server"
  },
  "ScannerSettings": {
    "LibraryPaths": [
      "/path/to/your/media/folder"
    ],
    "ScanIntervalMinutes": 15,
    "SupportedExtensions": [ ".mkv", ".mp4", ".avi" ]
  }
}
```

- **`LibraryPaths`** — one or more absolute paths to directories containing your video files. The scanner runs automatically every `ScanIntervalMinutes` minutes and picks up new files.

### 4. Apply database migrations

```bash
cd scripts/ef-core
./db-update.sh
cd ../..
```

### 5. Start the API

```bash
dotnet run --project apps/MediaServer.Api
```

The API listens on `http://0.0.0.0:5231`. Swagger UI is available at `http://localhost:5231/swagger`.

### 6. Configure the frontend

Create `apps/web-client/.env.local`:

```
VITE_API_URL=http://<your-server-LAN-ip>:5231/api
```

Replace `<your-server-LAN-ip>` with the local IP of the machine running the API (e.g. `192.168.1.100`). This is required so the TV (or any device on your network) can reach the API.

### 7. Start the frontend (browser / development)

```bash
cd apps/web-client
npm install
npm run dev -- --host
```

Open `http://localhost:5173` in your browser. The `--host` flag makes the dev server reachable from other devices on your LAN.

---

## Adding Media to the Catalog

The backend scanner automatically discovers video files in your configured `LibraryPaths`, but you must manually assign metadata (title, description, poster) through the admin panel.

1. Open the app and navigate to **Admin Panel** (gear icon or `/admin`)
2. **Library tab** — shows all discovered media files with their transcode status
3. **Add Movie** — select a media file, enter a title, description, and poster URL
4. **Add TV Show** — enter show metadata, then check and order the episode files
5. **Manage tab** — edit or delete existing movies and TV shows; use "Edit Show" to update metadata, reorder, add, or remove episodes

### Transcode status

Transcoding starts automatically in the background when a media file is first played. The UI shows progress in the Library tab and on each details page. A file is playable once its status shows **Ready**.

---

## Running on Your Network (TV / Other Devices)

The API is bound to `0.0.0.0:5231`, so any device on your LAN can reach it. Make sure:

- Your firewall allows inbound TCP on port `5231`
- The frontend's `VITE_API_URL` points to the server's LAN IP, not `localhost`

For production/permanent use, build the frontend instead of running the dev server:

```bash
cd apps/web-client
npm run build
# Serve the dist/ folder with any static file server, e.g.:
npx serve dist
```

---

## Samsung Tizen TV Deployment

> Skip this section if you only want to use Divino in a browser.

This section covers everything needed to package the frontend as a `.wgt` app and install it directly on a Samsung Smart TV.

### 1. Prerequisites

**Tizen Studio** — provides the `tizen` and `sdb` CLI tools used for packaging, installing, and debugging.

- Download and install [Tizen Studio](https://developer.tizen.org/development/tizen-studio/download)
- After installation, add the CLI tools to your `PATH`:
  ```
  # Typical locations:
  # Linux/macOS: ~/tizen-studio/tools/ide/bin and ~/tizen-studio/tools
  # Windows:     C:\tizen-studio\tools\ide\bin and C:\tizen-studio\tools
  ```
- Verify the tools are available:
  ```bash
  tizen version
  sdb version
  ```

**Signing certificate** — Tizen requires all packages to be signed. A certificate is already included at `certs/samsung/author.p12`. You should use the certificate profile registered with your Samsung developer account. If you need to create a new one, do so through **Tizen Studio → Certificate Manager**.

**Developer Mode on the TV** — enables sideloading over the network:

1. On your Samsung TV, go to **Settings → Support → About This TV**
2. Rapidly press `12345` on the remote — a Developer Mode dialog appears
3. Toggle Developer Mode **On** and enter your PC's IP address
4. Restart the TV when prompted
5. After reboot, a "Developer Mode" banner appears on the home screen

> Developer Mode must be re-enabled every 50 hours unless you have a Samsung partner account. The TV needs to remain on the same LAN as your server.

### 2. Configure the API URL

Before building, confirm `apps/web-client/.env.local` points to your server's LAN IP — the TV will use this URL at runtime:

```
VITE_API_URL=http://192.168.1.xxx:5231/api
```

`localhost` will not work from the TV.

### 3. Build the production bundle

```bash
cd apps/web-client
npm run build
```

This runs the TypeScript compiler then Vite, producing a self-contained bundle in `dist/`.

### 4. Package as a Tizen widget

```bash
tizen package -t wgt -s author.p12 -- dist/
```

- `-t wgt` — output format (Tizen Web Application)
- `-s author.p12` — signing certificate (filename without path; Tizen resolves it from the Certificate Manager profile)
- `-- dist/` — the directory to package

On success, a file named `DivinoApp1.Divino.wgt` is created inside `dist/`.

### 5. Connect to the TV

```bash
sdb connect <TV_IP>
```

Confirm the connection:

```bash
sdb devices
# Should show your TV as "device"
```

If the TV shows an authorisation prompt, accept it.

### 6. Install on the TV

```bash
tizen install -t <TV_IP>:26101 -n DivinoApp1.Divino.wgt
```

The app ID is `DivinoApp1.Divino` (defined in `apps/web-client/public/config.xml`). After installation the app appears in **Apps → Downloaded** on the TV home screen.

### 7. Launch and remote-debug

Start the app and get the debugger port:

```bash
sdb shell 0 debug DivinoApp1.Divino
```

The output includes a port number (e.g. `port: 39155`). Open Chrome on your PC and navigate to:

```
chrome://inspect
```

Under **Remote Target**, click **Configure** and add `<TV_IP>:<port>`. The app's page will appear — click **inspect** to open a full DevTools session (console, elements, network).

### Re-deploying after code changes

```bash
cd apps/web-client
npm run build
tizen package -t wgt -s author.p12 -- dist/
tizen install -t <TV_IP>:26101 -n DivinoApp1.Divino.wgt
```

There is no hot reload for packaged Tizen apps. For day-to-day development, use the browser dev server (`npm run dev -- --host`) and only package when you need to verify TV-specific behaviour (remote keys, Shaka on the TV's browser engine).

### TV remote control reference

The player has three input modes that switch automatically based on context.

**Catalog & navigation screens**

| Key | Action |
|-----|--------|
| ↑ / ↓ / ← / → | Move focus |
| Enter | Open selected item |
| Back | Return to previous screen |

**Player — Playback mode** (default while watching)

| Key | Action |
|-----|--------|
| ← / → | Seek −10 s / +10 s |
| ↑ | Enter Controls mode (focuses Play/Pause) |
| Enter | Play / Pause |
| Back | Exit player |

**Player — Controls mode** (overlay bar visible)

| Key | Action |
|-----|--------|
| ← / → | Move focus across buttons |
| ↓ | Return to Playback mode |
| Enter | Activate focused button |
| Back | Exit player |

Buttons in order: **Back** · **−10 s** · **Play/Pause** · **+10 s** · **Subtitles (CC)** · **Mute** · **Fullscreen**

**Player — Subtitle menu** (opens when CC is activated)

| Key | Action |
|-----|--------|
| ↑ / ↓ | Move focus through subtitle tracks |
| Enter | Select track |
| ← | Close menu, return to Controls mode |

---

## Project Structure

```
apps/
├── MediaServer.Api/           API controllers, middleware, entry point
├── MediaServer.Application/   Use cases: Commands, Queries, Handlers, DTOs
├── MediaServer.Domain/        Core entities (no dependencies)
├── MediaServer.Infrastructure/ EF Core, repositories, FFmpeg services
├── MediaServer.IOC/           Dependency injection wiring
└── web-client/                React + TypeScript frontend (Vite)

scripts/
└── ef-core/                   Database migration helper scripts
```

---

## Database Migration Scripts

Run all scripts from `scripts/ef-core/`:

| Script | Purpose |
|--------|---------|
| `db-update.sh` | Apply all pending migrations |
| `migration-add.sh <Name>` | Create a new migration |
| `db-revert-last.sh` | Revert the last applied migration |
| `migration-remove-last.sh` | Delete the last migration file |
| `db-nuke.sh` | Drop the entire database |

---

## Development Notes

- The API must bind to `0.0.0.0` (not `localhost`) for LAN / TV access — this is already set in `launchSettings.json`
- The frontend uses `HashRouter` (required for Tizen packaged apps — Tizen opens `index.html` directly, which breaks `BrowserRouter`)
- The Samsung TV Back key fires `keyCode 10009`
- `config.xml` must **not** have an `<?xml ...?>` declaration — Tizen's XML parser rejects it
- Subtitle files are stored alongside the source video and served as VTT
- FFmpeg must be available on the server's `PATH` for transcoding to work
