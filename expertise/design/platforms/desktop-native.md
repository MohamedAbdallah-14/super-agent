# Desktop Native Design — Platform Expertise Module

> Desktop native design covers the principles, patterns, and conventions for building applications that feel at home on macOS, Windows, and Linux. Unlike web or mobile, desktop apps operate in a multi-window, keyboard-driven, high-density environment where users expect deep OS integration, persistent state, and pixel-perfect rendering across varied display configurations. This module synthesizes guidance from Apple Human Interface Guidelines (macOS / Liquid Glass), Microsoft Fluent Design System (Windows 11), and GNOME Human Interface Guidelines (Adwaita / libadwaita) to provide a unified reference for cross-platform desktop design.

---

## 1. Platform Design Language

### 1.1 macOS — Apple Human Interface Guidelines

macOS design is defined by spatial clarity, translucency, and content-first hierarchy. As of macOS Tahoe (2025), Apple introduced Liquid Glass — a material that behaves like real glass with real-time refraction, specular highlights, and dynamic color adaptation to surrounding content.

**Core visual principles:**

- **Translucency and vibrancy.** Sidebar backgrounds use vibrancy effects that blur and tint underlying content, creating visual depth while maintaining readability. Vibrancy is context-dependent — sidebar vibrancy differs from toolbar vibrancy.
- **Liquid Glass material.** Toolbars and navigation elements float as translucent glass bubbles that appear and disappear based on context. The material refracts light, responds to movement, and adapts between light and dark environments. Properties include translucency, refraction strength, specular intensity, and blur radius.
- **Sidebar navigation.** The sidebar appears on the leading edge and serves as the primary navigation structure. It supports hierarchical disclosure, drag reordering, and badges. Source lists (mailboxes, playlists) are the canonical pattern.
- **Toolbar conventions.** Toolbars sit at the top of the window and provide quick access to frequent actions. They support customization (users can add/remove/rearrange items). Title bar and toolbar are often unified into a single region. Toolbar items use template images that adapt to light/dark mode automatically.
- **Menu bar.** The global menu bar at the top of the screen is mandatory. Every action available via toolbar or context menu must also be accessible through the menu bar. Standard menus include the app menu, File, Edit, Format, View, Window, and Help.
- **Window chrome.** Traffic light buttons (close/minimize/zoom) at the top-left. Full-screen mode via the green button. Windows remember their last position and size.

**Accessibility in Liquid Glass:**

- Reduced Transparency makes Liquid Glass frostier, obscuring more background content.
- Increased Contrast renders elements predominantly black or white with contrasting borders.
- Reduced Motion decreases effect intensity and disables elastic material properties.

### 1.2 Windows — Microsoft Fluent Design System

Fluent Design for Windows 11 centers on materials, depth, motion, and light to create interfaces that feel grounded and responsive. Fluent 2 (current) extends the system across platforms.

**Core visual principles:**

- **Mica material.** An opaque material subtly tinted with the user's desktop wallpaper color. Used as the primary background for app windows, replacing Acrylic for persistent surfaces. Mica is computationally lighter than Acrylic and provides a sense of personalization.
- **Acrylic material.** A semi-transparent frosted-glass material. In Windows 11, Acrylic is reserved exclusively for transient, light-dismiss surfaces — flyouts, context menus, command bars. It is brighter and more translucent than previous versions.
- **Reveal highlight.** A lighting effect that illuminates interactive elements on hover, revealing hidden borders and affordances. Uses a radial gradient that follows the cursor.
- **Connected animations.** Seamless transitions that maintain visual continuity as users navigate between states. Elements appear to flow from one view to another rather than appearing/disappearing abruptly.
- **Rounded corners.** Windows 11 uses consistent 8px corner radius on windows, controls, and overlays.
- **Navigation pane.** A collapsible sidebar (NavigationView) with icon+label items, hierarchical sections, and a hamburger toggle. The pane can be pinned open, collapsed to icons only, or hidden.
- **Title bar.** The title bar integrates with the app's content area. Apps can extend content into the title bar while preserving the system caption buttons (minimize/maximize/close) at the top-right.

**Spacing system:**

Fluent uses a 4px base unit grid. The spacing ramp includes 4, 8, 12, 16, 20, 24, 32, 40, 48, and 64px values. This reduces ambiguity and ensures consistent spatial rhythm.

### 1.3 Linux — GNOME and KDE

**GNOME (Adwaita / libadwaita):**

GNOME's Adwaita design language emphasizes simplicity, content focus, and adaptive layouts. libadwaita (the GTK extension library) enforces GNOME HIG compliance.

- **Header bar.** Replaces the traditional title bar + toolbar with a unified header bar containing the window title, navigation controls, and primary actions. Close button appears at the top-right by default (configurable).
- **Adaptive sidebar (AdwSidebar).** Introduced in libadwaita, this widget intelligently adjusts between a permanent sidebar on wide displays and an overlay or compact navigation element on narrow windows or tablets.
- **Flat design.** Controls have minimal borders and shadows. Hover and active states use subtle background color changes rather than elevation.
- **Typography.** As of GNOME 48 (2025), the default font changed from Cantarell to Adwaita Sans (based on Inter), and the monospace font changed from Source Code Pro to Adwaita Mono (based on Iosevka).
- **Responsive patterns.** libadwaita provides breakpoints for layout adaptation, allowing apps to reflow from multi-pane to single-pane layouts based on window width.

**KDE (Breeze):**

KDE Plasma uses the Breeze visual style with its own HIG at develop.kde.org/hig/.

- **Familiar patterns.** KDE encourages reusing UX patterns from Breeze and other systems (Material Design, Apple HIG) that users already know.
- **Rounded corners.** Plasma 6.5 introduced fully rounded window corners.
- **Toolbar and menu bar.** KDE apps typically support both a traditional menu bar and a hamburger menu, letting users choose their preference.
- **Customizability.** KDE emphasizes user control — toolbar layout, keyboard shortcuts, and color schemes are all configurable.

### 1.4 Desktop vs Web App Mindset

Desktop applications differ fundamentally from web apps in user expectations:

| Aspect | Web App | Desktop App |
|---|---|---|
| Navigation | URL-based, back button | Sidebar, tabs, multi-window |
| Keyboard | Tab/Enter focused | Full shortcut system (Cmd/Ctrl+key) |
| File access | Upload/download dialogs | Direct filesystem, drag-and-drop |
| State persistence | Session/server | Local storage, window position memory |
| Multi-tasking | Browser tabs | Multiple app windows, split views |
| Context menus | Limited or custom | Rich, platform-native right-click menus |
| Clipboard | Basic text | Rich content (images, files, formatted text) |
| System integration | Minimal | Tray icons, notifications, file associations |
| Offline | Progressive enhancement | Expected by default |

### 1.5 Electron / Tauri Design Considerations

When building desktop apps with web technologies, the primary challenge is achieving native feel.

**Achieving native feel:**

- Use the platform's system font (SF Pro on macOS, Segoe UI Variable on Windows, Adwaita Sans on GNOME) rather than bundling custom fonts for UI chrome.
- Respect platform-specific window controls (traffic lights on macOS at top-left, caption buttons on Windows at top-right).
- Implement native context menus rather than HTML-based menus. Users can immediately tell the difference.
- Support platform keyboard shortcuts (Cmd on macOS, Ctrl on Windows/Linux).
- Use native file dialogs, color pickers, and print dialogs — never custom web implementations.
- Match the platform's scrollbar appearance and behavior.
- Support system-level dark mode and accent color preferences.

**Tauri-specific advantages:**

- System webview means the app inherits the platform's native rendering behaviors.
- Smaller bundle size (2-10 MB vs 120+ MB for Electron) feels more native from install.
- Sub-500ms startup time matches native app expectations.
- Security-first model (opt-in permissions) aligns with native OS security patterns.

**Electron-specific considerations:**

- Ship consistent rendering across platforms via bundled Chromium (trade-off: larger bundle).
- Use `BrowserWindow` options like `titleBarStyle: 'hiddenInset'` on macOS for native-feeling title bars.
- Implement `vibrancy` and `backgroundMaterial` options for platform materials.
- Each BrowserWindow costs 50-150 MB — design for minimal concurrent windows.

---

## 2. Layout & Navigation Patterns

### 2.1 Sidebar + Content Pane (Master-Detail)

The sidebar-plus-content-pane layout is the dominant desktop navigation pattern across all three platforms. It works because desktop screens provide sufficient horizontal space for persistent navigation.

**Structure:**

```
+-------+----------------------------------+
| Side  |                                  |
| bar   |        Content Pane              |
|       |                                  |
| Nav   |   (detail view, editor,          |
| items |    list, dashboard)              |
|       |                                  |
+-------+----------------------------------+
```

**Conventions by platform:**

- **macOS:** Sidebar width is typically 200-260px. Uses vibrancy/translucency. Supports source list style (grouped, with disclosure triangles). Collapsible via View menu or keyboard shortcut.
- **Windows:** NavigationView provides Left, LeftCompact (icons only), and LeftMinimal (hamburger only) display modes. Default width is 320px open, 48px compact. Supports hierarchical items, footers, and search.
- **GNOME:** AdwSidebar adapts between permanent sidebar (wide window), overlay sidebar (medium), and bottom navigation (narrow/mobile). Typical sidebar width is 240-300px.

**Three-column variant:**

```
+-------+------------+--------------------+
| Side  | List/      |                    |
| bar   | Index      |    Detail View     |
|       |            |                    |
+-------+------------+--------------------+
```

Used by mail clients (Apple Mail, Outlook, Thunderbird), note apps, and file managers. The middle column shows a scrollable list; the right column shows the selected item's details.

### 2.2 Menu Bar Conventions

**macOS (mandatory):**

Every macOS app must provide a menu bar. Standard menus follow this order:

1. **App menu** (app name): About, Preferences/Settings (Cmd+,), Services, Hide, Quit (Cmd+Q)
2. **File**: New (Cmd+N), Open (Cmd+O), Save (Cmd+S), Save As (Cmd+Shift+S), Close (Cmd+W), Print (Cmd+P)
3. **Edit**: Undo (Cmd+Z), Redo (Cmd+Shift+Z), Cut (Cmd+X), Copy (Cmd+C), Paste (Cmd+V), Select All (Cmd+A), Find (Cmd+F)
4. **Format** (if applicable): Font, text styling
5. **View**: Toggle Sidebar, Enter Full Screen, zoom controls
6. **Window**: Minimize (Cmd+M), Zoom, Bring All to Front, tab management
7. **Help**: Search field, app help

**Windows (optional but expected for productivity apps):**

Windows apps may use a traditional menu bar or a Ribbon/Command Bar. When using a menu bar:

1. **File**: New, Open, Save, Print, Exit (Alt+F4)
2. **Edit**: Undo (Ctrl+Z), Redo (Ctrl+Y), Cut/Copy/Paste, Find (Ctrl+F)
3. **View**: Zoom, status bar toggle, pane toggles
4. **Tools/Options**: Settings, preferences
5. **Help**: About, documentation

Many modern Windows apps use a hamburger menu or command bar instead of a traditional menu bar.

**GNOME:**

GNOME apps typically use a primary menu (hamburger icon in the header bar) for infrequent actions (Preferences, About, Keyboard Shortcuts, Quit). Frequent actions are placed directly in the header bar as icon buttons.

### 2.3 Toolbar Patterns

**Placement and behavior:**

- **macOS:** Toolbar sits below (or unified with) the title bar. Supports customization via right-click. Overflow items go into a chevron dropdown. Use template images (monochrome) that auto-adapt to light/dark.
- **Windows:** Command bar sits below the title bar. Fluent 2 recommends a compact command bar with overflow menu. The Ribbon (used in Office) is a tabbed toolbar variant for apps with many commands.
- **GNOME:** Primary actions go directly in the header bar. Secondary actions in the header bar's overflow menu. Avoid separate toolbar rows.

**General rules:**

- Place the most frequently used 5-7 actions in the toolbar.
- Group related actions with separators or spacing.
- Provide tooltips for all toolbar icons.
- Every toolbar action must have a menu bar equivalent and, ideally, a keyboard shortcut.
- Support toolbar customization in productivity apps.

### 2.4 Multi-Window Management

Desktop users expect multi-window support. Key patterns:

- **Document-based apps:** Each document can open in its own window. Track open windows in the Window menu (macOS) or taskbar (Windows).
- **Inspector/palette windows:** Floating panels that stay above the main window (e.g., color pickers, property inspectors). Use `NSPanel` on macOS, tool windows on Windows.
- **Preferences/Settings:** Opens as a separate window (macOS tradition) or as a dedicated page within the app (Windows Settings pattern).
- **Detachable panels:** Allow users to drag tabs or panels out into separate windows (e.g., browser tabs, IDE editor tabs).

**Window state persistence:**

- Remember window position, size, and which monitor it was on.
- Restore the previous layout on app relaunch.
- Handle monitor disconnection gracefully — move windows to a visible display.
- Support window snapping on Windows 11 (1/2, 1/3, 1/4 screen layouts via Snap Layouts).

### 2.5 Keyboard Shortcuts

Keyboard shortcuts are non-negotiable in desktop apps. Power users rely on them heavily.

**Platform modifier keys:**

| Action | macOS | Windows / Linux |
|---|---|---|
| Primary modifier | Cmd (Command) | Ctrl |
| Secondary modifier | Option (Alt) | Alt |
| Tertiary modifier | Control | Win key |
| New | Cmd+N | Ctrl+N |
| Open | Cmd+O | Ctrl+O |
| Save | Cmd+S | Ctrl+S |
| Undo / Redo | Cmd+Z / Cmd+Shift+Z | Ctrl+Z / Ctrl+Y |
| Cut / Copy / Paste | Cmd+X/C/V | Ctrl+X/C/V |
| Find | Cmd+F | Ctrl+F |
| Close window | Cmd+W | Ctrl+W or Alt+F4 |
| Quit app | Cmd+Q | Alt+F4 (no standard quit) |
| Preferences | Cmd+, | Ctrl+, (convention, not OS standard) |
| Select All | Cmd+A | Ctrl+A |
| Print | Cmd+P | Ctrl+P |
| Full Screen | Cmd+Ctrl+F or globe+F | F11 |
| Tab switching | Cmd+1..9 or Ctrl+Tab | Ctrl+1..9 or Ctrl+Tab |
| Command palette | Cmd+Shift+P | Ctrl+Shift+P |

**Best practices:**

- Never override OS-level shortcuts (e.g., Cmd+Tab, Alt+Tab, Cmd+Space).
- Display shortcuts next to menu items so users can learn them.
- Support a "Keyboard Shortcuts" reference panel (Cmd+/ or Ctrl+/).
- Allow custom shortcut binding in power-user apps.
- Use Cmd on macOS and Ctrl on Windows/Linux — never use Ctrl as the primary modifier on macOS.

### 2.6 Right-Click Context Menus

Context menus are a primary interaction pattern on desktop. Users right-click instinctively.

**Design rules:**

- Always provide context menus on interactive elements (list items, text, images, files, canvas objects).
- Use native context menus — not custom HTML/CSS overlays. Users can tell the difference by rendering style, animation timing, and behavior with screen edges.
- Keep menus short (5-10 items). Use separators to group related actions.
- Place destructive actions (Delete, Remove) at the bottom, separated from other items.
- Submenus should be at most one level deep. Deeply nested submenus are unusable.
- Include keyboard shortcut hints next to menu items.
- Dynamically adjust menu content based on the selected item(s) and current state.
- On macOS, context menus also appear via Ctrl+Click and the menu key on extended keyboards.

### 2.7 Status Bar Patterns

The status bar sits at the bottom of the window and displays non-critical, ambient information.

**Common content:**

- Current cursor position or selection info (text editors: line/column)
- Document statistics (word count, file size)
- Encoding and line-ending format
- Zoom level
- Background task progress
- Connection status (online/offline, sync state)

**Conventions:**

- Keep status bar text small (11-12px) and low-contrast so it does not compete with content.
- Make it toggleable via the View menu.
- Interactive elements in the status bar (zoom slider, encoding selector) should use click, not right-click.
- VS Code popularized the "rich status bar" pattern with clickable segments — this is now expected in developer tools.

### 2.8 Window Resizing and Responsive Behavior

Desktop apps must handle arbitrary window sizes gracefully.

**Minimum and maximum sizes:**

- Set a minimum window size that prevents layout breakage (commonly 800x600 or 1024x768 for productivity apps, 400x300 for utility windows).
- Maximum size is generally unconstrained (let users use their full screen).

**Responsive strategies:**

- **Sidebar collapse:** At narrow widths, collapse the sidebar to icon-only mode or hide it behind a toggle button. Threshold: typically 700-900px window width.
- **Column stacking:** In three-column layouts, drop to two columns, then one column as width decreases.
- **Content reflow:** Text wraps, images resize, grid layouts adjust column count.
- **Overflow menus:** Toolbar items that do not fit move into a chevron/overflow dropdown.

**High-DPI / Retina behavior:**

- Render all UI elements at the display's native resolution.
- Use vector icons (SVG) or provide 1x, 2x, and 3x raster assets.
- Test on mixed-DPI multi-monitor setups (e.g., Retina laptop + 1080p external).
- Handle DPI changes when windows move between monitors.

---

## 3. Component Conventions

### 3.1 Native Controls vs Custom

**Always use native controls for:**

- File open/save dialogs — users expect OS-level file navigation, recent files, and favorites.
- Color pickers — the system color picker integrates with saved colors and accessibility features.
- Print dialogs — the system print dialog handles printer selection, page setup, and preview.
- Font pickers — the system font panel provides proper font browsing and preview.
- Date/time pickers — system pickers respect locale and calendar preferences.
- Alert/confirmation dialogs — system dialogs integrate with accessibility and voiceover.

**Use custom controls when:**

- The platform does not provide the needed control (e.g., a code editor, timeline, canvas).
- The control needs to look identical across platforms (design tools like Figma).
- The native control lacks needed features (e.g., rich text editor, data grid with virtual scrolling).

**Rules for custom controls:**

- Match the platform's visual language (corner radius, colors, typography, spacing).
- Support the same keyboard interactions as native equivalents (Tab to focus, Space to activate, Escape to dismiss).
- Implement proper accessibility (ARIA roles, focus management, screen reader announcements).
- Respect the system's color scheme (light/dark mode, accent color).

### 3.2 Drag and Drop

Drag and drop is a fundamental desktop interaction absent or limited in web and mobile.

**Conventions:**

- **Visual feedback:** Show a drag preview (ghost image) that represents what is being dragged. Highlight valid drop targets with a border or background color change. Show a "forbidden" cursor over invalid drop zones.
- **Drop target affordance:** If your app has a file drop target, also provide a click-to-browse alternative. Not all users discover drag-and-drop.
- **Partial acceptance:** If a user drops a mix of supported and unsupported file types, accept the valid items and silently skip the rest. Show a brief, non-blocking notification if items were skipped.
- **Spring-loaded folders:** On macOS, hovering a dragged item over a folder for ~1 second opens it. Implement similar expand-on-hover behavior for tree views.
- **Cross-application drag:** Support dragging files, text, and images between your app and other apps (Finder, Explorer, desktop).
- **Cancellation:** Pressing Escape during a drag should cancel the operation. Dropping outside a valid target should also cancel without side effects.

### 3.3 System Tray / Menu Bar Icons

**macOS menu bar extras:**

- Use template images (monochrome, `Template` suffix) that automatically adapt to light/dark mode and menu bar tinting.
- Size: 18x18pt (36x36px @2x). Keep icons simple — they render at small sizes in a constrained space.
- Provide a popover or dropdown menu on click. Do not open a full window.
- Reserve menu bar extras for apps that run persistently in the background (VPN, time tracking, clipboard managers).

**Windows system tray (notification area):**

- Icons appear in the system tray at the right end of the taskbar.
- Provide a context menu on right-click and a primary action (show main window) on left-click.
- Use the notification area for background status — not as a primary interaction point.
- Windows 11 may hide tray icons by default; users must explicitly pin them.

**Linux (GNOME / KDE):**

- GNOME does not natively support system tray icons (removed in GNOME 3). Use the AppIndicator extension (libappindicator) or portal APIs.
- KDE supports system tray icons natively through the Status Notifier protocol.

### 3.4 Notifications

**When to use native (system) notifications:**

- Background events the user should know about (download complete, message received, build finished).
- Time-sensitive information when the app is not focused.
- Events that benefit from OS-level grouping, Do Not Disturb integration, and notification center history.

**When to use in-app notifications (toasts/banners):**

- Confirmations of user-initiated actions ("File saved," "Settings updated").
- Non-critical status updates while the user is actively using the app.
- Contextual messages that relate to the current view.

**Best practices:**

- Use native notifications sparingly — notification fatigue causes users to disable them entirely.
- On macOS, request notification permissions and support notification categories (informational, time-sensitive, critical).
- On Windows, integrate with the Action Center. Support toast actions (inline reply, quick actions).
- Include an app setting to control notification frequency and types.
- Never use sound for non-critical notifications.

### 3.5 Preferences / Settings Window

**macOS convention:**

- Open via the app menu or Cmd+, (mandatory shortcut).
- Uses a toolbar with category icons (General, Appearance, Accounts, Advanced) — each category shows a panel of related settings.
- Window title changes to reflect the selected category.
- Settings take effect immediately (no "Save" or "Apply" button). Use toggle switches, dropdown menus, and checkboxes.
- The window should not close on Escape — it is a regular window, not a transient dialog.
- Settings window remembers its last-viewed category.

**Windows convention:**

- Open via File > Options, Tools > Settings, or the gear icon.
- Uses a left-side navigation pane with category pages (similar to Windows 11 Settings app).
- May include an "OK" / "Cancel" / "Apply" button pattern for settings that require explicit confirmation, though modern apps increasingly favor immediate application.

**GNOME convention:**

- Open via the primary menu > Preferences.
- Uses a flat or mildly categorized layout with AdwPreferencesPage and AdwPreferencesGroup.
- Settings apply immediately. Switches and dropdowns are the primary controls.
- Single-window, scrollable layout — no separate window per category.

---

## 4. Typography & Spacing System

### 4.1 macOS Typography

**System font:** SF Pro (San Francisco). Automatically selected by the system.

- **Optical sizes:** SF Pro Text (below 20pt) has larger apertures and more generous letter-spacing for legibility. SF Pro Display (20pt and above) has tighter spacing optimized for headlines.
- **Dynamic tracking:** The system automatically adjusts letter spacing per point size for optimal readability.

**Default text styles (macOS):**

| Style | Weight | Size | Use |
|---|---|---|---|
| Large Title | Regular | 26pt | Window titles, hero text |
| Title 1 | Regular | 22pt | Section headers |
| Title 2 | Regular | 17pt | Subsection headers |
| Title 3 | Semibold | 15pt | Group headers |
| Headline | Bold | 13pt | Emphasized body text |
| Body | Regular | 13pt | Primary content (default) |
| Callout | Regular | 12pt | Secondary descriptions |
| Subheadline | Regular | 11pt | Metadata, captions |
| Footnote | Regular | 10pt | Legal text, footnotes |
| Caption 1 | Regular | 10pt | Labels, annotations |
| Caption 2 | Medium | 10pt | Timestamps, badges |

**Key detail:** macOS body text defaults to 13pt — smaller than iOS (17pt) because desktop users sit farther from the screen and have precise pointing devices.

### 4.2 Windows Typography

**System font:** Segoe UI Variable. A variable font with two axes:

- **Weight axis (wght):** Incremental from Thin (100) to Bold (700).
- **Optical size axis (opsz):** Automatic, optimizes glyph shapes from 8pt to 36pt. Smaller sizes get wider counters; larger sizes get more personality.

**Default type ramp (Windows 11 / Fluent 2):**

| Style | Weight | Size | Line Height | Use |
|---|---|---|---|---|
| Display | Semibold | 68px | 92px | Hero areas |
| Title Large | Semibold | 40px | 52px | Page titles |
| Title | Semibold | 28px | 36px | Section titles |
| Subtitle | Semibold | 20px | 26px | Subsection headers |
| Body Large | Regular | 18px | 24px | Emphasized body |
| Body | Regular | 14px | 20px | Primary content (default) |
| Caption | Regular | 12px | 16px | Secondary, metadata |

**Spacing grid:** 4px base unit. All spacing values are multiples of 4 (4, 8, 12, 16, 20, 24, 32, 40, 48, 64px).

### 4.3 Linux Typography

**GNOME (Adwaita, as of GNOME 48+):**

- **Body font:** Adwaita Sans (based on Inter). Default body size: 11pt (~14.67px).
- **Monospace font:** Adwaita Mono (based on Iosevka).
- **Heading scale:** GNOME HIG uses CSS classes (`.title-1` through `.title-4`, `.heading`, `.body`, `.caption`) to define the type scale.

**KDE (Breeze):**

- **Body font:** Noto Sans (default on many distributions). Default size: 10pt.
- **KDE supports user-configurable fonts** at the system level. Apps should use the system font setting rather than hardcoding.

### 4.4 Desktop Density and Click Targets

Desktop interfaces are denser than mobile because users have a precise pointing device (mouse/trackpad).

**Minimum click target sizes:**

| Platform | Minimum | Recommended |
|---|---|---|
| macOS | 24x24pt | 28x28pt for toolbar icons |
| Windows (Fluent) | 24x24px (32x32px with padding) | 36x36px for primary actions |
| GNOME | 24x24px | 34x34px for header bar buttons |
| Touch-enabled (Windows tablets) | 40x40px | 48x48px |

**Spacing density:**

- Desktop UIs use tighter spacing than mobile: 4-8px between related elements, 12-16px between groups, 24-32px between sections.
- Lists and tables commonly use 28-36px row heights (compared to 48-56px on mobile).
- Padding within controls: 6-8px vertical, 12-16px horizontal.

---

## 5. Common Mistakes

### 5.1 Web App Feeling in a Native Shell

**The problem:** Wrapping a web app in Electron/Tauri without adapting its design to desktop conventions. Users immediately notice custom scrollbars, HTML context menus, non-native file dialogs, and web-style navigation (back/forward buttons instead of sidebars).

**The fix:** Audit every interaction point against the target platform's HIG. Replace custom implementations with native equivalents for dialogs, menus, and notifications. Use the system font. Match the platform's control styles (border radius, focus rings, hover states).

### 5.2 Ignoring Platform Keyboard Shortcuts

**The problem:** Using Ctrl as the modifier on macOS, not implementing standard shortcuts (Cmd+, for preferences, Cmd+Q for quit), or overriding OS-level shortcuts.

**The fix:** Maintain a platform-specific shortcut map. Test all standard shortcuts (new, open, save, undo, redo, find, close, quit, preferences). Detect the platform at runtime and remap accordingly. Display correct modifier symbols in menus and tooltips.

### 5.3 Not Supporting Multi-Window

**The problem:** Forcing everything into a single window with tabs when users expect to spread work across multiple windows or monitors.

**The fix:** Support opening documents/items in new windows. Implement a Window menu (macOS) or taskbar grouping (Windows). Allow detaching tabs into separate windows. Remember per-window state independently.

### 5.4 Poor DPI / Scaling Support

**The problem:** Blurry rendering on Retina/4K displays. Incorrectly sized UI on high-DPI screens. Broken layouts when moving windows between monitors with different scale factors.

**The fix:**
- Use vector graphics (SVG) for icons or provide @1x, @2x, @3x raster assets.
- Test on Retina Mac (2x), Windows at 100%, 125%, 150%, 200% scaling, and mixed-DPI multi-monitor setups.
- Handle DPI-change events (e.g., when a window is dragged from a Retina display to an external 1080p monitor).
- Never hardcode pixel values for layout — use logical points or density-independent pixels.
- On Windows, declare DPI awareness in the app manifest to avoid automatic (blurry) scaling by the OS.

### 5.5 Missing Dark Mode Support

**The problem:** Hardcoding light colors, not responding to system theme changes, or implementing dark mode that does not match the platform's dark appearance.

**The fix:**
- Detect the system theme preference at launch and respond to changes in real time.
- On macOS, use semantic colors (e.g., `NSColor.textColor`, `NSColor.windowBackgroundColor`) that automatically adapt.
- On Windows, follow the Fluent 2 dark theme palette. Use Mica/Acrylic materials that adapt automatically.
- On GNOME, libadwaita handles dark mode via `AdwStyleManager`. Use Adwaita CSS variables.
- Test both modes thoroughly — dark mode is not just inverting colors. Check contrast ratios, image visibility, and shadow rendering.

### 5.6 Ignoring Right-Click Context Menus

**The problem:** Not providing context menus, or providing empty/generic ones. Desktop users right-click constantly and expect contextually relevant options.

**The fix:** Implement context menus on all interactive elements. Include the most common actions for the clicked element. Add keyboard shortcut hints. Use native menu rendering, not custom overlays.

### 5.7 No Window State Persistence

**The problem:** The app opens at a default size/position every time, forgetting the user's preferred layout.

**The fix:** Save window bounds (position, size, maximized state) on close. Restore on next launch. Handle edge cases: saved position on a now-disconnected monitor, saved size larger than current screen, display arrangement changes.

### 5.8 Blocking the Main Thread

**The problem:** Long-running operations freeze the entire UI. The window becomes unresponsive, the title bar shows "Not Responding" (Windows), or the spinning beach ball appears (macOS).

**The fix:** Run all computation, file I/O, and network requests off the main thread. Use worker threads, utility processes (Electron), or async operations. Show progress indicators for operations longer than 300ms. Allow cancellation of long operations.

### 5.9 Inconsistent Cross-Platform Behavior

**The problem:** The app looks and behaves identically on all platforms, ignoring each platform's conventions. Or conversely, the app has such different UIs per platform that users cannot transfer knowledge between them.

**The fix:** Share the information architecture and core interaction patterns across platforms. Adapt the visual presentation and platform-specific interactions (menus, shortcuts, window chrome, file dialogs) to each platform's conventions. Use a shared design system with platform-specific overrides.

### 5.10 Poor Accessibility

**The problem:** Custom controls that are invisible to screen readers, missing keyboard navigation, insufficient contrast, no support for system accessibility preferences (reduced motion, increased contrast, reduced transparency).

**The fix:** Use native controls where possible (they come with built-in accessibility). For custom controls, implement full ARIA roles, focus management, and keyboard interaction. Respect macOS Accessibility preferences, Windows High Contrast mode, and GNOME a11y settings. Test with VoiceOver (macOS), Narrator/NVDA (Windows), and Orca (Linux).

---

## 6. Desktop Native Design Checklist

Use this checklist to verify that a desktop application meets native design standards across platforms.

### Platform Integration

- [ ] **System font used.** UI chrome uses SF Pro (macOS), Segoe UI Variable (Windows), or Adwaita Sans / system default (Linux) — not a custom bundled font for standard controls.
- [ ] **Native window chrome.** Window controls (close/minimize/maximize) are in the correct position for each platform. Title bar style matches platform conventions.
- [ ] **Menu bar present (macOS).** All app actions are accessible through the global menu bar. Standard menu order is followed (App, File, Edit, View, Window, Help).
- [ ] **Keyboard shortcuts correct.** Cmd is used as primary modifier on macOS, Ctrl on Windows/Linux. All standard shortcuts (new, open, save, undo, find, close, quit, preferences) are implemented.
- [ ] **Native dialogs used.** File open/save, color picker, print dialog, and font picker all use the OS-provided implementations.
- [ ] **Context menus provided.** Right-click on interactive elements shows a native context menu with relevant actions and shortcut hints.

### Visual Design

- [ ] **Dark mode supported.** The app detects and responds to system theme changes in real time. Both light and dark modes are tested for contrast and readability.
- [ ] **High-DPI rendering.** All UI elements render crisply on Retina (macOS), high-DPI (Windows at 150%+), and standard displays. Vector icons or multi-resolution raster assets provided.
- [ ] **Mixed-DPI multi-monitor tested.** Moving windows between monitors with different scale factors does not cause blurriness or layout issues.
- [ ] **Platform materials used.** Vibrancy/Liquid Glass on macOS, Mica/Acrylic on Windows 11, or Adwaita styling on GNOME — as appropriate.
- [ ] **Consistent spacing.** Spacing follows the platform's grid system (8pt on macOS, 4px multiples on Windows). Density is appropriate for desktop (not mobile-spaced).

### Navigation & Interaction

- [ ] **Sidebar navigation implemented.** For apps with multiple sections, a collapsible sidebar provides persistent navigation. Sidebar collapses gracefully at narrow window widths.
- [ ] **Multi-window support.** Users can open content in multiple windows. Window positions and sizes are persisted and restored.
- [ ] **Drag and drop.** Files and content can be dragged into (and, where appropriate, out of) the app. Visual feedback shows valid drop targets. Escape cancels drag.
- [ ] **Window state persistence.** Window size, position, maximized state, and sidebar width are saved and restored across sessions.

### System Integration

- [ ] **System notifications.** Background events use native OS notifications that integrate with notification center / action center. Notifications respect Do Not Disturb.
- [ ] **System tray / menu bar icon** (if applicable). Background apps provide a tray icon with context menu. macOS uses template images. Windows supports tray icon pinning.
- [ ] **Accessibility verified.** Screen reader compatibility tested (VoiceOver, Narrator/NVDA, Orca). Full keyboard navigation. System accessibility preferences (reduced motion, high contrast, reduced transparency) respected.
- [ ] **Auto-update mechanism.** The app checks for updates in the background and notifies the user without disrupting their work. Update installation is user-initiated.

### Performance

- [ ] **Startup time under 2 seconds.** The app shows meaningful UI within 2 seconds of launch. Use lazy loading for non-critical content.
- [ ] **No UI freezing.** Long operations run off the main thread. Progress indicators shown for tasks exceeding 300ms. Spinning beach ball (macOS) and "Not Responding" (Windows) never appear during normal use.

---

*Researched: 2026-03-07 | Sources: [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/), [Apple HIG — Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars), [Apple HIG — Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars), [Apple HIG — The Menu Bar](https://developer.apple.com/design/human-interface-guidelines/the-menu-bar), [Apple HIG — Typography](https://developer.apple.com/design/human-interface-guidelines/typography), [Apple HIG — Drag and Drop](https://developer.apple.com/design/human-interface-guidelines/drag-and-drop), [Apple HIG — Designing for macOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-macos), [Meet Liquid Glass — WWDC25](https://developer.apple.com/videos/play/wwdc2025/219/), [Apple Liquid Glass Newsroom](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/), [Liquid Glass Accessibility](https://designedforhumans.tech/blog/liquid-glass-smart-or-bad-for-accessibility), [Microsoft Fluent 2 — Material](https://fluent2.microsoft.design/material), [Microsoft Fluent 2 — Typography](https://fluent2.microsoft.design/typography), [Microsoft Fluent 2 — Layout](https://fluent2.microsoft.design/layout), [Windows Typography](https://learn.microsoft.com/en-us/windows/apps/design/signature-experiences/typography), [Windows Materials](https://learn.microsoft.com/en-us/windows/apps/design/signature-experiences/materials), [Windows Acrylic Material](https://learn.microsoft.com/en-us/windows/apps/design/style/acrylic), [Windows High DPI](https://learn.microsoft.com/en-us/windows/win32/hidpi/high-dpi-desktop-application-development-on-windows), [Windows UX Checklist](https://learn.microsoft.com/en-us/windows/win32/uxguide/top-violations), [Windows App Best Practices](https://learn.microsoft.com/en-us/windows/apps/get-started/best-practices), [GNOME Human Interface Guidelines](https://developer.gnome.org/hig/), [GNOME HIG — Patterns](https://developer.gnome.org/hig/patterns.html), [GNOME HIG — Guidelines](https://developer.gnome.org/hig/guidelines.html), [GNOME HIG — Design Principles](https://developer.gnome.org/hig/principles.html), [Adwaita Design Language](https://en.m.wikipedia.org/wiki/GNOME_Human_Interface_Guidelines), [libadwaita Adaptive Sidebar](https://www.phoronix.com/news/GNOME-AdwSidebar), [libadwaita 1.8 Release](https://linuxiac.com/libadwaita-1-8-arrives-alongside-gnome-49/), [KDE Human Interface Guidelines](https://develop.kde.org/hig/), [Fluent Design System — Wikipedia](https://en.wikipedia.org/wiki/Fluent_Design_System), [Tauri vs Electron 2026](https://blog.nishikanta.in/tauri-vs-electron-the-complete-developers-guide-2026), [Community HIG Extras](https://github.com/sindresorhus/human-interface-guidelines-extras), [Cross-Platform Desktop UX](https://www.todesktop.com/blog/posts/designing-desktop-apps-cross-platform-ux)*
