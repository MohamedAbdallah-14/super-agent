# Desktop (Electron) — Expertise Module

> An Electron specialist builds cross-platform desktop applications using web technologies (HTML, CSS, JavaScript/TypeScript) packaged with Chromium and Node.js. The scope covers process architecture (main/renderer/preload), IPC communication, security hardening, native OS integration, auto-updates, packaging, code signing, and performance optimization across Windows, macOS, and Linux. Current stable: Electron 40.x (Chromium 144, Node 22).

---

## Core Patterns & Conventions

### Project Structure

Use **electron-vite** or **electron-forge** scaffolding. Separate source into `main/`, `preload/`, and `renderer/` directories with independent entry points.

```
src/
  main/
    index.ts              # app entry, BrowserWindow creation
    ipc/                  # ipcMain handlers grouped by domain
      file-handlers.ts
      dialog-handlers.ts
    windows/              # window factory & management
    menu/                 # app menu & context menus
    updater/              # auto-update logic
  preload/
    index.ts              # contextBridge.exposeInMainWorld
    api.d.ts              # TypeScript declarations for exposed API
  renderer/
    index.html
    src/
      App.tsx             # root component (React/Vue/Svelte)
      components/
      pages/
      store/              # renderer-side state (Zustand, Pinia)
  shared/
    types.ts              # IPC channel names, payload types
resources/
  icons/                  # platform-specific icons (icns, ico, png)
electron-builder.yml      # or forge.config.ts
electron.vite.config.ts
```

### Naming Conventions

| Element | Convention | Example |
|---|---|---|
| IPC channels | `kebab-case` with domain prefix | `file:open`, `dialog:show-save` |
| Window identifiers | `kebab-case` | `main-window`, `settings-window` |
| Preload API namespace | `camelCase` under `window.api` | `window.api.openFile()` |
| Main process handlers | `camelCase` functions | `handleFileOpen()` |
| Shared types | `PascalCase` interfaces | `IpcPayload`, `WindowConfig` |

### Architecture: Process Model

- **Main process**: Single Node.js process. Creates windows, handles OS integration (menus, tray, notifications, file system), manages app lifecycle. Full Node.js access.
- **Renderer process**: One per BrowserWindow. Runs web content in sandboxed Chromium. No direct Node.js or Electron API access when properly configured.
- **Preload script**: Bridge between main and renderer. Exposes a controlled API surface via `contextBridge`. Runs before renderer content loads.
- **Utility process** (Electron 25+): `utilityProcess` for CPU-intensive work. Runs Node.js without Chromium overhead, replacing deprecated `child_process.fork()` patterns.

**IPC Communication Patterns:**

```
Renderer  ──ipcRenderer.invoke──>  Main   (request/response, async)
Renderer  ──ipcRenderer.send────>  Main   (fire-and-forget)
Main      ──webContents.send────>  Renderer (push notifications)
```

Always use typed channel names from a shared constants file. Never pass raw `ipcRenderer` to the renderer.

### Framework Integration

**Recommended stack (2025-2026):**
- **Build tool**: electron-vite (Vite-based, fast HMR, ESM)
- **Renderer framework**: React 19+ / Vue 3.5+ / Svelte 5+
- **State**: Zustand (React), Pinia (Vue), built-in stores (Svelte)
- **Styling**: Tailwind CSS 4 or CSS Modules
- **TypeScript**: Mandatory for all three processes

### State Management

- **Renderer-side**: Standard web framework stores (Zustand, Redux Toolkit, Pinia). Keep UI state here.
- **Persistent state**: `electron-store` or `better-sqlite3` in main process. Expose via IPC only.
- **Cross-process sync**: Renderer requests via `invoke`, main pushes changes via `webContents.send`. Never share mutable references.

### Window Management

```typescript
const win = new BrowserWindow({
  width: 1400, height: 900, minWidth: 800, minHeight: 600,
  show: false, // prevent white flash
  webPreferences: {
    preload: path.join(__dirname, '../preload/index.js'),
    contextIsolation: true,  // MANDATORY
    nodeIntegration: false,  // MANDATORY
    sandbox: true,           // recommended
  },
});
win.once('ready-to-show', () => win.show());
```

Track windows by ID via a manager singleton. Restore bounds from persistent storage. Avoid creating excessive windows (each costs 50-150 MB).

### File System Access

Always access the file system from the main process. Expose specific operations via IPC with path validation, never general `fs` access.

### Menu, Tray, and Auto-Update

- Build menus with `Menu.buildFromTemplate()`. Use role-based items for standard actions.
- Tray: Use template images on macOS (`iconTemplate.png`). Destroy on quit.
- Auto-update: Use `electron-updater` (electron-builder) or `update-electron-app` (Forge). Check every ~4 hours, not on every focus. Let user decide when to download/install.

---

## Anti-Patterns & Pitfalls

### 1. Enabling `nodeIntegration: true` in Renderer
**Why:** Grants the renderer full Node.js access. Any XSS vulnerability can execute arbitrary system commands. Default is `false` since Electron 5.

### 2. Disabling `contextIsolation`
**Why:** Preload and renderer share the same JS context. Malicious scripts can override prototypes to intercept data. Default is `true` since Electron 12.

### 3. Exposing `ipcRenderer` Directly via contextBridge
**Why:** `exposeInMainWorld('ipc', ipcRenderer)` lets any code send ANY IPC message. Expose one function per channel with explicit argument shapes instead.

### 4. Running Heavy Computation in the Main Process
**Why:** Blocks the event loop for ALL windows. Use `utilityProcess` (Electron 25+) or Web Workers.

### 5. Using the Deprecated `remote` Module
**Why:** Removed in Electron 14. Created synchronous cross-process proxies that leaked main-process objects. Use explicit `ipcMain.handle` / `ipcRenderer.invoke`.

### 6. Loading Remote URLs Without CSP
**Why:** Without Content Security Policy, injected `<script>` tags execute with renderer privileges.

### 7. Not Validating IPC Arguments in Main Process
**Why:** A compromised renderer can send crafted payloads. Validate types, ranges, paths. Never pass IPC args directly to `fs` or `child_process`.

### 8. Creating Excessive BrowserWindows
**Why:** Each spawns a full Chromium renderer (50-150 MB). Use `WebContentsView` for embedded content or swap via routing.

### 9. Bundling Unnecessary Dependencies
**Why:** Electron already ships ~120 MB. Tree-shake, use `devDependencies` correctly, audit with `files` config.

### 10. Ignoring `ready-to-show` (White Flash)
**Why:** Showing a window immediately displays blank white until content loads. Use `show: false` + `ready-to-show`.

### 11. Not Handling `will-navigate` and `setWindowOpenHandler`
**Why:** Without these, clicks can navigate to phishing sites or open new windows running with elevated privileges.

### 12. Using Synchronous IPC (`sendSync`)
**Why:** Blocks the renderer's main thread. Always use async `invoke` / `handle`.

### 13. Forgetting to Destroy Windows on Close
**Why:** On macOS, closing hides by default. Retained references to destroyed windows cause memory leaks and crashes.

### 14. Skipping Code Signing
**Why:** macOS Gatekeeper and Windows SmartScreen block/warn on unsigned apps. macOS 10.15+ requires signing AND notarization.

### 15. Using `shell.openExternal` Without URL Validation
**Why:** Untrusted URLs can execute `file://` or custom protocol URIs to run arbitrary programs. Validate against an allowlist.

---

## Testing Strategy

### Unit Testing (Renderer)

Use **Vitest** (preferred with electron-vite) or **Jest**. Mock `window.api` at module level.

```typescript
vi.stubGlobal('api', {
  listFiles: vi.fn().mockResolvedValue(['file1.txt', 'file2.txt']),
});
test('renders file list', async () => {
  render(<FileList />);
  expect(await screen.findByText('file1.txt')).toBeDefined();
});
```

### Main Process Testing

Mock Electron modules before importing handlers. Test IPC handlers as pure async functions with mocked `event` objects.

### E2E Testing with Playwright

Playwright has experimental but functional Electron support via CDP. It is the recommended successor to the deprecated Spectron.

```typescript
import { test, expect, _electron as electron } from '@playwright/test';

test('app launches and shows main window', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = await app.firstWindow();
  expect(await window.title()).toBe('My App');

  const isPackaged = await app.evaluate(({ app }) => app.isPackaged);
  expect(isPackaged).toBe(false);

  await window.click('button#open-file');
  await expect(window.locator('.file-content')).toBeVisible();
  await app.close();
});
```

Key capabilities: `app.evaluate()` runs code in main process, standard Playwright locators and auto-waiting work, use `electron-playwright-helpers` for common patterns.

### IPC Testing

1. Unit-test main handlers with mocked `event` objects
2. Unit-test preload functions with mocked `ipcRenderer`
3. E2E tests verify full round-trip (renderer -> preload -> main -> response)

---

## Performance Considerations

### Startup Time

Users notice if an app takes >2 seconds to show UI.

1. **Bundle with Vite/esbuild**: Replace synchronous `require()` chains. Bundling alone reduces startup 50%+.
2. **Lazy-load renderer routes**: `React.lazy`, dynamic `import()` for non-initial views.
3. **Defer non-critical main work**: Delay auto-update checks, analytics until first window visible.
4. **`show: false` + `ready-to-show`**: Perceived instant launch.
5. **V8 snapshots**: Advanced (VS Code uses this) -- serialize initialized state into a snapshot.

### Memory Management

- Each BrowserWindow: 50-150 MB. Minimize concurrent windows.
- `backgroundThrottling: true` (default) reduces background window usage.
- Destroy windows fully when not needed. Use `utilityProcess` over hidden windows.
- Profile with Chrome DevTools memory profiler for DOM node leaks.

### Bundle Size

- Tree-shake with ESM. Audit with `webpack-bundle-analyzer` or `rollup-plugin-visualizer`.
- Use `files` config to exclude tests, docs, dev files from the packaged app.
- ASAR packaging (default with electron-builder) compresses app code.

### GPU Acceleration

Hardware acceleration is on by default. Improves CSS animations, WebGL, canvas. Disable with `app.disableHardwareAcceleration()` only for headless/server environments or GPU driver issues.

---

## Security Considerations

### Mandatory Configuration

```typescript
new BrowserWindow({
  webPreferences: {
    contextIsolation: true,      // isolate preload from renderer
    nodeIntegration: false,      // no Node.js in renderer
    sandbox: true,               // OS-level sandbox
    webSecurity: true,           // enforce same-origin policy
    allowRunningInsecureContent: false,
  },
});
```

### Context Isolation (Electron 12+ default)

Separate JavaScript worlds for preload and renderer. Prevents prototype pollution where renderer code overrides built-in methods to intercept preload data.

### Sandbox Mode (Electron 20+ default)

Sandboxed renderers cannot access Node.js APIs even in preload. Only `contextBridge`, limited `ipcRenderer`, and `webFrame` are available.

### Content Security Policy

```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
           img-src 'self' data:; connect-src 'self' https://api.yourapp.com;">
```

Avoid `'unsafe-eval'` in production.

### Code Signing Requirements

| Platform | Requirement | Tool |
|---|---|---|
| macOS | Developer ID + Notarization (mandatory since Catalina) | `@electron/osx-sign`, `@electron/notarize` |
| Windows | EV or Standard Code Signing Certificate | `signtool.exe`, Azure Trusted Signing |
| Linux | GPG signing (optional, recommended for repos) | `gpg`, `dpkg-sig` |

### Additional Hardening

- `setWindowOpenHandler()` to control/block `window.open()`
- Handle `will-navigate` to prevent navigation to untrusted URLs
- Use `safeStorage` API for encrypting sensitive data at rest
- Validate URLs before `shell.openExternal()`
- `ses.setPermissionRequestHandler` to control camera/microphone/geolocation grants
- Keep Electron updated to patch Chromium and Node.js CVEs

---

## Integration Patterns

### Native Modules (N-API)

Use when JavaScript cannot meet performance or OS API requirements. Prefer **N-API** (stable ABI) via `node-addon-api`. Rebuild for Electron with `@electron/rebuild`. For calling existing shared libraries without C++, use `ffi-napi`.

### System Tray

```typescript
import { Tray, Menu, nativeImage } from 'electron';

const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
const tray = new Tray(icon);
tray.setContextMenu(Menu.buildFromTemplate([
  { label: 'Show', click: () => mainWindow.show() },
  { type: 'separator' },
  { label: 'Quit', click: () => app.quit() },
]));
```

Use template images on macOS (`iconTemplate.png`, `iconTemplate@2x.png`) for dark/light mode.

### Deep Links and Protocol Handlers

```typescript
app.setAsDefaultProtocolClient('myapp');

app.on('open-url', (event, url) => {       // macOS
  event.preventDefault();
  handleDeepLink(url);
});
app.on('second-instance', (_e, argv) => {  // Windows/Linux
  const url = argv.find(a => a.startsWith('myapp://'));
  if (url) handleDeepLink(url);
  mainWindow?.focus();
});
```

### Notifications, Clipboard, Drag-and-Drop

- **Notifications**: `new Notification({ title, body, icon }).show()` -- uses native OS notification center.
- **Clipboard**: `clipboard` module from main process for programmatic access.
- **Drag-and-drop**: Standard HTML5 DnD in renderer. File drops expose `File.path` (Electron extension). Outbound drag via `webContents.startDrag()`.

---

## DevOps & Deployment

### Build Tools

**electron-builder** (community standard, ~1.1M weekly downloads):
- Cross-platform builds from one OS. NSIS, DMG, AppImage, Snap, deb, rpm.
- YAML config. Built-in auto-update with differential downloads. Extensive installer customization.

**electron-forge** (official Electron tool, ~6.9K stars):
- Plugin-based. Receives Electron features first (ASAR integrity, universal macOS).
- Only packages for current platform. JS/TS config. Simpler for beginners.

### Auto-Updates

**electron-updater** (electron-builder): GitHub Releases, S3, generic HTTP. Differential updates, staged rollouts, code signature validation, Linux support.

**update-electron-app** (Forge): Simpler API. Uses `update.electronjs.org` (free for OSS). Squirrel-based.

### CI/CD Cross-Platform Builds

```yaml
# GitHub Actions
jobs:
  build:
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci && npm run build && npm run dist
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
          CSC_LINK: ${{ secrets.MAC_CERTIFICATE }}        # macOS
          APPLE_ID: ${{ secrets.APPLE_ID }}                # notarization
          WIN_CSC_LINK: ${{ secrets.WIN_CERTIFICATE }}     # Windows
```

### Crash Reporting

**Sentry** (`@sentry/electron`): Captures JS errors + native crashes (Crashpad minidumps). Breadcrumbs, source maps, upload on next launch. `Sentry.init({ dsn })` in main process.

### Tauri as a Modern Alternative

| Aspect | Electron 40 | Tauri 2.x |
|---|---|---|
| Runtime | Chromium + Node (~120 MB) | System webview + Rust (~2-10 MB) |
| Memory (idle) | 200-300 MB | 30-40 MB |
| Startup | 1-2 sec | <0.5 sec |
| Security | Opt-out (disable features) | Opt-in (allowlist features) |
| Ecosystem | Massive (npm, mature) | Growing (18% share, 2026) |
| Mobile | No | iOS + Android (Tauri 2.0) |

Choose Tauri for lightweight, security-first apps. Choose Electron for complex apps needing mature Node.js ecosystem or consistent cross-platform rendering.

---

## Decision Trees

### Electron vs Tauri vs Flutter Desktop

```
Need a desktop app?
+-- Team knows Rust or willing to learn?
|   +-- Yes + need consistent rendering? --> Electron (ships Chromium)
|   +-- Yes + lightweight/security-first? --> Tauri 2.x (system webview)
+-- JavaScript/TypeScript-only team?
|   +-- Heavy Node.js ecosystem needed?  --> Electron
|   +-- Minimal Node.js, small bundle?   --> Tauri (little Rust needed)
+-- Dart/Flutter team?
|   +-- Need mobile + desktop?           --> Flutter Desktop
+-- App size/memory critical?
|   +-- Yes --> Tauri (~5 MB installer)
|   +-- No  --> Electron (mature, proven)
```

### electron-builder vs electron-forge

```
+-- Cross-platform builds from one OS?  --> electron-builder
+-- Want official tooling, latest features? --> electron-forge
+-- Need differential/delta updates?    --> electron-builder
+-- Complex installer (NSIS scripts)?   --> electron-builder
+-- Prefer simple JS/TS config?         --> electron-forge
```

### Native Modules vs Pure JavaScript

```
+-- Electron API already covers it?     --> Use Electron API via IPC
+-- Pure JS npm package works?          --> Use it (no rebuild complexity)
+-- Calling existing C/Rust .so/.dll?   --> ffi-napi (no C++ needed)
+-- Max perf (image, crypto, compress)? --> node-addon-api (N-API)
+-- Can run as WASM?                    --> WASM (portable, no rebuild)
```

---

## Code Examples

### Secure Preload Script with Typed API

```typescript
// preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  readFile: (path: string) => ipcRenderer.invoke('file:read', path),
  saveFile: (path: string, content: string) =>
    ipcRenderer.invoke('file:save', path, content),
  showOpenDialog: () => ipcRenderer.invoke('dialog:open'),
  setTitle: (title: string) => ipcRenderer.send('window:set-title', title),
  onUpdateAvailable: (cb: (version: string) => void) => {
    const handler = (_e: unknown, version: string) => cb(version);
    ipcRenderer.on('update:available', handler);
    return () => ipcRenderer.removeListener('update:available', handler);
  },
});
```

```typescript
// preload/api.d.ts -- makes window.api typed in renderer
export interface ElectronAPI {
  readFile: (path: string) => Promise<string>;
  saveFile: (path: string, content: string) => Promise<void>;
  showOpenDialog: () => Promise<string[] | undefined>;
  setTitle: (title: string) => void;
  onUpdateAvailable: (cb: (version: string) => void) => () => void;
}
declare global { interface Window { api: ElectronAPI; } }
```

### IPC Handler with Input Validation

```typescript
// main/ipc/file-handlers.ts
ipcMain.handle('file:read', async (_event, filePath: string) => {
  if (typeof filePath !== 'string') throw new Error('Invalid path');
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(app.getPath('userData'))) {
    throw new Error('Access denied: path outside allowed directory');
  }
  return fs.promises.readFile(resolved, 'utf-8');
});

ipcMain.handle('dialog:open', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return undefined;
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [{ name: 'Text', extensions: ['txt', 'md', 'json'] }],
  });
  return result.canceled ? undefined : result.filePaths;
});
```

### Auto-Updater Setup

```typescript
import { autoUpdater } from 'electron-updater';

autoUpdater.autoDownload = false;

export function setupUpdater(mainWindow: BrowserWindow): void {
  autoUpdater.checkForUpdates().catch(() => {});

  autoUpdater.on('update-available', (info) =>
    mainWindow.webContents.send('update:available', info.version));
  autoUpdater.on('download-progress', (p) =>
    mainWindow.webContents.send('update:progress', Math.round(p.percent)));
  autoUpdater.on('update-downloaded', () =>
    mainWindow.webContents.send('update:downloaded'));

  ipcMain.handle('update:download', () => autoUpdater.downloadUpdate());
  ipcMain.handle('update:install', () => autoUpdater.quitAndInstall(true, true));

  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 4 * 3600_000);
}
```

### Utility Process for CPU-Intensive Work

```typescript
// main/workers/image-processor.ts (utility process entry)
process.parentPort.on('message', async ({ data }) => {
  if (data.type === 'resize') {
    const sharp = require('sharp');
    const buf = await sharp(data.buffer).resize(data.w, data.h).toBuffer();
    process.parentPort.postMessage({ type: 'result', buffer: buf });
  }
});

// main/index.ts -- spawn utility process
import { utilityProcess } from 'electron';
const worker = utilityProcess.fork(path.join(__dirname, 'workers/image-processor.js'));
worker.postMessage({ type: 'resize', buffer: imgBuf, w: 800, h: 600 });
worker.on('message', (data) => { /* handle result */ });
```

---

*Researched: 2026-03-07 | Sources: [Electron Security Docs](https://www.electronjs.org/docs/latest/tutorial/security), [Electron Context Isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation), [Electron Process Model](https://www.electronjs.org/docs/latest/tutorial/process-model), [Electron IPC Tutorial](https://www.electronjs.org/docs/latest/tutorial/ipc), [Electron Performance Guide](https://www.electronjs.org/docs/latest/tutorial/performance), [Electron Releases](https://releases.electronjs.org/), [electron-vite](https://electron-vite.org/), [electron-builder Auto Update](https://www.electron.build/auto-update.html), [Electron Code Signing](https://www.electronjs.org/docs/latest/tutorial/code-signing), [Playwright Electron API](https://playwright.dev/docs/api/class-electron), [Sentry Electron SDK](https://docs.sentry.io/platforms/javascript/guides/electron/), [Why Electron Forge](https://www.electronforge.io/core-concepts/why-electron-forge), [Tauri vs Electron](https://www.gethopp.app/blog/tauri-vs-electron), [Electron Deep Links](https://www.electronjs.org/docs/latest/tutorial/launch-app-from-url-in-another-app), [Improving Electron Performance](https://palette.dev/blog/improving-performance-of-electron-apps), [Electron Automated Testing](https://www.electronjs.org/docs/latest/tutorial/automated-testing)*
