# Settings and Preferences -- Design Pattern Module

> **Module Type:** Pattern
> **Domain:** UI/UX Design Systems
> **Last Updated:** 2026-03-07
> **Applies To:** iOS, Android, Web, Desktop, Cross-Platform

---

## Quick Reference Checklist

Before shipping any settings interface, verify:

- [ ] Settings are grouped into logical categories with clear headings
- [ ] A search bar is present if total settings exceed ~15 items
- [ ] Toggles apply instantly; form-based settings use explicit save
- [ ] Destructive settings (delete account, reset) require multi-step confirmation
- [ ] Every control has a visible label and, where needed, a description
- [ ] Current values are visible at a glance without opening sub-screens
- [ ] A "Restore Defaults" or reset option is accessible
- [ ] System-wide preferences (accessibility, language) are respected, not duplicated
- [ ] Screen reader users can navigate settings and hear toggle states
- [ ] Settings that require app restart display a clear warning before applying
- [ ] Dangerous options are visually distinct and physically separated from benign ones
- [ ] Mobile touch targets are at least 44x44pt (iOS) / 48x48dp (Android)
- [ ] Changes provide immediate visual feedback (animation, toast, preview)
- [ ] Settings are reachable from a consistent, predictable entry point
- [ ] Import/export functionality exists for power users on complex apps

---

## 1. Pattern Anatomy

### 1.1 Settings Types

Settings interfaces serve different purposes depending on scope and audience. A well-designed app distinguishes clearly between these categories:

**App Settings (Behavioral)**
Control how the application behaves. Examples include default file format, auto-save interval, startup behavior, editor preferences, keyboard shortcuts, and performance options. These are typically scoped to the local device or workspace.

**Account Settings (Identity)**
Manage the user's identity and authentication: display name, email address, profile photo, password, two-factor authentication, connected accounts, and session management. These persist across devices because they are tied to the user's account, not the local installation.

**Notification Preferences**
Granular controls over what notifications the user receives and through which channels (push, email, in-app, SMS, desktop). Best-in-class implementations allow per-channel and per-event-type control rather than a single global toggle.

**Privacy Settings**
Data sharing, analytics opt-out, profile visibility, activity status, read receipts, and ad personalization. Post-GDPR and post-CCPA, these settings carry legal weight and must be discoverable.

**Accessibility Settings**
Font size overrides, high-contrast mode, reduce-motion preference, screen reader optimizations, caption preferences, and color-blind accommodations. Apple HIG and WCAG both stress that apps should primarily respect system-level accessibility settings rather than replicating them in-app, but app-specific enhancements are welcome.

**Appearance (Theme, Language, Display)**
Light/dark/system theme, accent color, font family, density (compact/comfortable), language, region, date format, time zone, and first day of week. These are among the most frequently accessed settings.

### 1.2 Organization Strategies

**Grouped Lists (iOS Model)**
The canonical iOS pattern uses grouped `UITableView` sections with inset styling. Each group has a header label and optional footer description. This works well for up to ~40 settings across 5-8 groups. Apple HIG recommends this as the default for in-app settings.

```
General
  [Language]         English (US)
  [Date Format]      MM/DD/YYYY
  [Start Week On]    Monday

Appearance
  [Theme]            System  >
  [Accent Color]     Blue    >
```

**Tabbed Settings (Web/Desktop Model)**
A vertical sidebar or horizontal tab bar divides settings into major sections. Each tab loads a dedicated panel. Used by VS Code, Slack, Discord, Notion, and most SaaS products. Scales well to hundreds of settings.

```
+------------------+-----------------------------------+
| General          | Theme: [System v]                 |
| Account          | Font Size: [14px ----o--------]   |
| Notifications    | Auto Save: [x] Enabled            |
| Privacy          |                                   |
| Appearance       | [Restore Defaults]                |
+------------------+-----------------------------------+
```

**Search in Settings**
For apps with more than approximately 15 settings, search is essential. VS Code's settings search is the gold standard: a persistent search bar at the top that live-filters the visible settings and highlights matching terms. Including search will make settings accessibility roughly 5x better than grouping by categories alone (Toptal, 2022). Search should match against setting names, descriptions, and related keywords.

**Flat Scrollable List**
A single scrollable page with section anchors. Works for simpler apps with fewer than 20 settings. Mobile-friendly because it avoids navigation depth. Notion uses this on mobile to good effect.

### 1.3 Inline Editing vs. Dedicated Screens

**Inline Editing (Preferred for Simple Values)**
Toggles, dropdowns, and sliders change values in place without navigating away. Users see the effect immediately. This is the correct choice for boolean settings, single-select options with fewer than 5 choices, and numeric ranges.

**Dedicated Screens (Required for Complex Values)**
Settings that involve multiple sub-options, rich editors, or lengthy lists should open a dedicated sub-screen or modal. Examples: notification preferences per channel, connected accounts management, keyboard shortcut editor, custom theme builder.

**Decision Rule:**
If a setting can be meaningfully represented and changed with a single control (toggle, dropdown, slider), keep it inline. If it requires explanation, multiple fields, or a preview, give it a dedicated screen.

---

## 2. Best-in-Class Examples

### 2.1 iOS Settings App

**What it does well:**
- Consistent grouped-list pattern with inset rounded rectangles
- Current values displayed as secondary text on the right side of each row
- Search bar at the top of the main settings screen
- Deep linking: apps can link directly to specific settings screens via URL schemes
- Clear hierarchy: system settings at the top, per-app settings below
- Accessibility settings are first-class citizens with their own top-level section

**Key pattern:** The disclosure indicator (chevron >) signals navigation to a sub-screen, while toggles indicate immediate in-place changes. Users learn this visual grammar once and apply it everywhere.

**Reference:** Apple Human Interface Guidelines -- Settings Pattern (developer.apple.com/design/human-interface-guidelines/patterns/settings/)

### 2.2 Slack Preferences

**What it does well:**
- Tabbed sidebar navigation: Notifications, Sidebar, Themes, Messages & Media, Language & Region, Accessibility, Mark as Read, Audio & Video, Connected Accounts, Privacy & Visibility, Advanced
- Each tab is a focused vertical scroll with grouped settings
- Notification preferences are granular: per-channel overrides, schedule (Do Not Disturb hours), and per-keyword mentions
- Theme picker shows a live preview strip of the selected theme
- Workspace-level vs. personal-level settings are clearly separated
- Expandable sections within tabs reduce visual clutter

**Key pattern:** The "Notification Schedule" feature demonstrates contextual settings that adapt based on time -- a pattern worth studying for any app with notification controls.

### 2.3 VS Code Settings

**What it does well:**
- Dual interface: GUI Settings Editor and raw JSON (`settings.json`)
- Powerful search with instant filtering, scope tags (`@modified`, `@ext:`, `@id:`), and result counts
- Three-tier scope: User > Workspace > Folder (with clear indicators of which level overrides which)
- Modified indicator (blue bar) shows settings that differ from defaults
- "Reset Setting" action on each individual setting
- Extension settings are automatically integrated into the same search and UI
- Breadcrumb navigation showing the current category path

**Key pattern:** The "modified settings" filter (`@modified`) lets users see only what they have changed -- an invaluable feature for debugging and auditing configuration.

**Reference:** VS Code Documentation -- User and Workspace Settings (code.visualstudio.com/docs/getstarted/settings)

### 2.4 Linear

**What it does well:**
- Clean two-column layout: sidebar categories, main content area
- Workspace settings vs. personal settings are distinct top-level sections
- Settings philosophy: "Settings are not a design failure" -- Linear intentionally provides preferences where designers should not impose opinions
- Import/export of workspace settings for team onboarding
- Issue-label colors, workflow states, and team-level defaults are all configurable
- Minimal descriptions; settings are named clearly enough to be self-explanatory

**Key pattern:** Linear distinguishes between "product settings that need to be right by default" and "preferences that designers deliberately shouldn't have a strong opinion on." This philosophy results in a curated, intentional settings surface.

**Reference:** Linear Blog -- "Settings are not a design failure" (linear.app/now/settings-are-not-a-design-failure)

### 2.5 Discord

**What it does well:**
- Full-screen settings overlay with sidebar navigation (15+ categories)
- "User Settings" vs. "Server Settings" scoping
- Per-server notification overrides with @everyone, @here, and role-based controls
- Keybinds editor with conflict detection
- Appearance settings include a live chat preview that updates in real time
- "Activity Privacy" and "Friend Requests" are easy to find under Privacy & Safety
- "Log Out" and "Delete Account" are visually separated at the bottom with red styling

**Key pattern:** Discord's real-time preview in Appearance settings (showing how the chat looks with a new theme, font size, or density) is exemplary for reducing uncertainty about what a setting will do.

### 2.6 Notion

**What it does well:**
- Modal-based settings dialog accessed from the sidebar
- Tabbed navigation: My Account, My Settings, My Notifications, My Connections, Language & Region, plus workspace sections
- Appearance toggle (Light/Dark/System) with immediate application
- Privacy section with "Show my view history" and "Profile discoverability" toggles
- Per-workspace settings: domain, allowed email domains, member management
- Mobile-optimized settings that collapse into a single scrollable screen

**Key pattern:** Notion's distinction between "My" (personal) settings and workspace settings creates a clear mental model for users who belong to multiple workspaces.

### 2.7 Figma

**What it does well:**
- Minimal settings surface -- most preferences are contextual (right-click, toolbar)
- Account settings in a web dashboard, not in the desktop app
- Nudge amount (small/large) configured inline in the editor via a quick preference
- Plugin and font settings are separate concerns with dedicated management screens
- Theme follows system preference by default with manual override

**Key pattern:** Figma demonstrates that not every app needs a large settings screen. By making preferences contextual and keeping the dedicated settings surface small, Figma avoids the "settings sprawl" problem.

### 2.8 GitHub

**What it does well:**
- Vertical sidebar navigation with 20+ categories
- Clear separation: Profile, Account, Appearance, Accessibility, Notifications, Billing, Emails, Password, Sessions, SSH Keys, GPG Keys, Developer Settings
- Notification routing is granular: per-repository, per-event, per-channel
- Danger Zone pattern: destructive actions (delete repository, transfer ownership) grouped in a red-bordered section at the bottom of each relevant page
- Saved replies, scheduled reminders, and code review settings demonstrate advanced per-workflow customization

**Key pattern:** GitHub's "Danger Zone" visual treatment (red border, red button, explicit "Type the repository name to confirm" friction) is the canonical example of destructive-action confirmation in settings.

---

## 3. User Flow Mapping

### 3.1 Primary Flow: Changing a Setting

```
[Entry Point]
     |
     v
[Settings Home / Search] --- search query --> [Filtered Results]
     |                                              |
     v                                              v
[Navigate to Category/Section]              [Jump to Setting]
     |                                              |
     v                                              v
[Locate Setting in List]                    [Locate Setting]
     |                                              |
     +----------------+----------------------------+
                       |
                       v
              [Change Value]
                       |
            +----------+----------+
            |                     |
     [Instant Apply]      [Explicit Save]
            |                     |
            v                     v
     [Visual Feedback]    [Save Button Active]
     (toast, animation,          |
      live preview)              v
            |             [Click Save]
            |                     |
            +----------+----------+
                       |
                       v
              [Effect Visible]
              (UI updates, behavior changes)
```

### 3.2 Dangerous Settings Flow

For irreversible actions (delete account, reset to defaults, revoke all sessions), the flow must introduce deliberate friction proportional to the action's severity:

**Low-Severity Destructive (Reversible)**
Example: Clear notification history, reset a single preference.
Flow: Action button -> Confirmation dialog with descriptive button text ("Clear History") -> Execute with undo toast (5-10 second window).

**Medium-Severity Destructive (Partially Reversible)**
Example: Remove a connected account, leave a workspace.
Flow: Action button (red/warning color) -> Confirmation dialog explaining consequences -> Execute with email notification.

**High-Severity Destructive (Irreversible)**
Example: Delete account, delete all data, transfer ownership.
Flow: Action button (red, isolated in "Danger Zone") -> Confirmation dialog -> Type confirmation phrase (account name, "DELETE", etc.) -> Cooldown period (GitHub uses 90 days for account deletion) -> Execute with email confirmation.

**Reference:** NNgroup recommends confirmation dialogs only for infrequent, consequential actions. Overuse of confirmation dialogs trains users to click "OK" without reading (nngroup.com/articles/confirmation-dialog/).

### 3.3 Import/Export Settings Flow

```
[Settings Screen]
     |
     +----> [Export Settings]
     |           |
     |           v
     |      [Select Scope] (all, category, specific settings)
     |           |
     |           v
     |      [Choose Format] (JSON, YAML, proprietary)
     |           |
     |           v
     |      [Download/Copy File]
     |
     +----> [Import Settings]
              |
              v
         [Upload/Paste File]
              |
              v
         [Validate & Preview Changes]
              |
              +---> [Conflicts Detected?]
              |          |
              |     [Show Diff: Current vs. Imported]
              |          |
              |     [User Resolves Conflicts]
              |          |
              v          v
         [Apply Settings]
              |
              v
         [Restart Required?] --yes--> [Show Warning + Restart Button]
              |
              no
              |
              v
         [Settings Applied -- Show Summary]
```

VS Code handles this well: its `settings.json` is inherently exportable, and workspace `.vscode/settings.json` files serve as importable presets that can be version-controlled.

### 3.4 Edge Cases

**Conflicting Settings**
When two settings contradict each other (e.g., "Send email notifications" is ON but "Email address" is empty), the interface should:
1. Visually flag the conflict with a warning icon and inline message
2. Prevent saving until the conflict is resolved, OR
3. Apply the safe default and notify the user

**Settings Requiring Restart**
Some changes (language, certain performance flags, plugin states) cannot take effect until the app restarts. The correct pattern is:
1. Apply the setting to the stored configuration immediately
2. Display a persistent banner: "Restart required for [setting name] to take effect"
3. Provide a "Restart Now" action button in the banner
4. Never silently restart without user consent

**Offline Settings Changes**
If settings sync across devices, changes made offline should be queued and synced on reconnection. Conflict resolution should favor the most recent change (last-write-wins) with optional manual resolution for critical settings.

**Permission-Gated Settings**
Some settings require elevated permissions (admin-only workspace settings, parental controls). These should be visible but disabled for unauthorized users, with a clear explanation of who can change them and how to request access.

---

## 4. Micro-Interactions

### 4.1 Toggle Animation

The toggle switch is the most common settings control. Its micro-interaction communicates state change:

**Anatomy of a Toggle Micro-Interaction:**
1. **Resting state:** Thumb positioned left (off) or right (on), track color reflects state
2. **Press/touch:** Thumb slightly expands (iOS) or shows ripple (Material)
3. **Slide:** Thumb moves along track with spring/ease-out curve (150-250ms)
4. **Color transition:** Track color cross-fades between off-state (gray) and on-state (accent color)
5. **Settle:** Thumb reaches final position, optional subtle bounce

**Platform-specific timing:**
- iOS: 200ms spring animation with slight overshoot
- Material Design 3: 200ms with standard easing, ripple extends from touch point
- Web (CSS): `transition: transform 200ms ease-out, background-color 150ms ease`

**Critical requirement:** The toggle must convey state through more than color alone. Use position (left/right), optional "On"/"Off" labels, and ARIA attributes for accessibility.

### 4.2 Slider Thumb

For settings like font size, volume, or opacity:

1. **Drag start:** Thumb scales up slightly (1.2x) to confirm grab
2. **Dragging:** Value label appears above thumb showing current value
3. **Snap points:** Optional haptic feedback at meaningful values (e.g., 100%, default)
4. **Release:** Thumb scales back to normal, value label fades after 1 second
5. **Live preview:** The affected element (text size, volume indicator) updates in real time during drag

### 4.3 Color Picker

For theme or accent color selection:

1. **Swatch grid:** Pre-selected brand colors in a grid, selected swatch gets a checkmark overlay and ring
2. **Custom color:** Expanding the picker reveals HSL/RGB sliders or a color wheel
3. **Live preview:** UI elements update to the selected color in real time
4. **Confirmation:** Optional "Apply" button for complex custom colors, or instant-apply for preset swatches

### 4.4 Instant-Apply vs. Save Button

**Instant-Apply (Preferred for Individual Settings)**
Each control change takes effect immediately. Feedback is provided via:
- Toggle animation completing
- Toast notification: "Setting updated"
- Live UI change (theme switches immediately)
- Subtle checkmark animation next to the changed setting

**Explicit Save (Required for Batch Changes)**
When multiple related settings must be changed atomically (e.g., SMTP configuration: host + port + credentials), use a form with a Save button:
- Save button is disabled until changes are detected
- "Unsaved changes" indicator appears in the tab/section header
- Navigation away triggers "You have unsaved changes" confirmation
- After save: button shows brief "Saved" state with checkmark, then returns to disabled

### 4.5 Undo for Destructive Changes

After a destructive setting change:
1. Show a toast/snackbar at the bottom: "Setting changed. [Undo]"
2. Undo link is available for 5-10 seconds
3. If undo is clicked, revert the setting with a brief reverse animation
4. If the toast expires, the change is finalized

Gmail's "Undo Send" is the canonical example of this pattern applied to a time-sensitive action.

### 4.6 Preview of Setting Effect

Before committing to a change, show users what will happen:
- **Theme preview:** Discord shows a live chat preview with the selected theme
- **Font size preview:** A sample text block updates in real time as the slider moves
- **Notification preview:** A mock notification appears showing the selected sound and visual style
- **Layout preview:** Compact vs. comfortable density shows a before/after thumbnail

---

## 5. Anti-Patterns

### 5.1 Settings Sprawl

**Problem:** Exposing every possible configuration without curation. The settings screen becomes a dumping ground for engineering flags.
**Fix:** Audit settings regularly. If fewer than 5% of users change a setting, consider removing it or moving it to an "Advanced" section. Linear's philosophy of deliberately choosing which preferences to expose is the antidote.

### 5.2 No Search in Large Settings

**Problem:** Apps with 50+ settings that rely solely on category navigation. Users cannot find what they need.
**Fix:** Add a persistent search bar. VS Code demonstrates that settings search with filtering, scope tags, and match highlighting transforms the settings experience.

### 5.3 Restart Without Warning

**Problem:** Applying a setting that requires an application restart without informing the user beforehand. The app restarts unexpectedly, causing data loss.
**Fix:** Display a clear warning before the setting is applied: "This change requires a restart. Any unsaved work will be lost. Restart now?" Provide "Restart Now" and "Restart Later" options.

### 5.4 No Defaults/Reset Option

**Problem:** Users change a setting, forget the original value, and have no way to return to the default.
**Fix:** Provide a "Reset to Default" action on individual settings (VS Code's approach) and a global "Restore All Defaults" option. Show the default value as a hint or placeholder.

### 5.5 Burying Important Settings Too Deep

**Problem:** Critical settings (privacy controls, notification preferences) are nested 3+ levels deep. Users cannot find them and assume the app does not offer them.
**Fix:** Keep critical and frequently-changed settings within 1-2 taps of the settings home screen. Use search and direct deep links from relevant UI contexts (e.g., a "Manage Notifications" link in the notification panel).

### 5.6 Jargon Labels

**Problem:** Settings labeled with engineering terminology: "Enable WebSocket fallback," "TTL override," "Prefetch buffer size."
**Fix:** Use plain language that describes the effect: "Use alternative connection method," "Cache expiration time," "Pre-load content for faster browsing." Add a brief description below the label if the setting name alone is ambiguous.

### 5.7 Settings Without Descriptions

**Problem:** A toggle labeled "Smart Inboxing" with no explanation of what it does.
**Fix:** Every non-obvious setting should have a 1-2 line description below the label explaining what it controls and what the user should expect when changing it.

### 5.8 Ambiguous Toggle State

**Problem:** A toggle labeled "Disable notifications" -- when the toggle is ON, are notifications disabled (confusing double-negative) or enabled?
**Fix:** Always frame toggles positively: "Enable notifications" ON = notifications are on. Avoid negative framing. If the label must be negative, add explicit "On"/"Off" text labels adjacent to the toggle.

### 5.9 Auto-Saving Without Feedback

**Problem:** Settings auto-save, but the user receives no confirmation. They are left wondering whether the change was registered.
**Fix:** Provide brief visual feedback: a checkmark animation, a "Saved" micro-toast, or a subtle flash on the changed row. The feedback should be noticeable but not disruptive.

### 5.10 Dangerous Actions Near Benign Ones

**Problem:** "Delete Account" button directly below "Change Display Name" with identical styling.
**Fix:** Isolate destructive actions in a dedicated section (GitHub's "Danger Zone"), use red/warning styling, and add physical space or a divider between dangerous and benign options. NNgroup specifically warns against placing consequential options close to benign options (nngroup.com/articles/proximity-consequential-options/).

### 5.11 Platform-Inconsistent Settings Location

**Problem:** Settings are in the hamburger menu on mobile, under "File > Preferences" on desktop, and at the bottom of the sidebar on web. Users cannot build muscle memory.
**Fix:** Use platform-conventional entry points: gear icon in the bottom-left or sidebar on web/desktop, profile avatar or dedicated "Settings" tab on mobile. Be consistent with platform expectations.

### 5.12 All-or-Nothing Notification Controls

**Problem:** A single toggle for all notifications. Users who want to disable marketing emails but keep security alerts must choose between all or nothing.
**Fix:** Provide granular per-category and per-channel controls. At minimum, distinguish between critical (security, billing) and non-critical (marketing, social, tips) notifications.

### 5.13 Settings That Silently Affect Other Users

**Problem:** A workspace admin changes a setting that affects all team members without any indication that this is a shared setting.
**Fix:** Clearly label workspace-wide settings with scope indicators: "This affects all members of [workspace name]." Show an admin badge and optionally notify affected members.

### 5.14 No Confirmation for Irreversible Changes

**Problem:** Clicking "Reset to Factory Defaults" immediately wipes all customizations without confirmation.
**Fix:** For any irreversible action, require explicit confirmation with a dialog that names the specific consequences.

---

## 6. Accessibility

### 6.1 Screen Reader Navigation

**Semantic Structure:**
- Use heading hierarchy (h2 for categories, h3 for subcategories) so screen reader users can jump between sections
- Group related settings in `<fieldset>` elements with `<legend>` labels on web
- On iOS, use `accessibilityLabel` and `accessibilityHint` on each setting row
- On Android, ensure each `Preference` item has a `contentDescription`

**Navigation Order:**
- Settings should follow a logical tab order matching the visual layout
- The search bar should be the first focusable element
- Category navigation (sidebar/tabs) should come before setting controls
- "Save" and "Cancel" buttons should be reachable without tabbing through all settings

### 6.2 Toggle State Announcements

Toggles must announce their current state and changes:

**Web (ARIA):**
```html
<button role="switch" aria-checked="true" aria-label="Dark mode">
  <span class="toggle-track">
    <span class="toggle-thumb"></span>
  </span>
</button>
```
When toggled, screen readers should announce: "Dark mode, switch, on" or "Dark mode, switch, off."

**iOS:**
`UISwitch` automatically announces state. Custom toggles must set:
- `accessibilityTraits = .button`
- `accessibilityValue = isOn ? "On" : "Off"`

**Android:**
`SwitchMaterial` announces state changes automatically. Custom implementations must use `ViewCompat.setStateDescription()`.

**Critical requirement (WCAG 2.1 SC 1.3.1):** Toggle state must not rely solely on color. Position, label text, and ARIA/accessibility attributes must all convey state independently.

### 6.3 Form Control Labels

Every settings control must have a programmatically associated label:

- **Web:** Use `<label for="setting-id">` or `aria-labelledby`
- **Descriptions:** Use `aria-describedby` to associate help text with the control
- **Groups:** Use `<fieldset>` + `<legend>` for related settings (e.g., a group of notification channel checkboxes)
- **Error states:** Use `aria-invalid="true"` and `aria-errormessage` for validation errors

### 6.4 Settings Search Accessibility

- Search input must have a visible label or `aria-label="Search settings"`
- Search results should be announced via `aria-live="polite"` region: "5 settings found"
- Filtering should not move focus unexpectedly; the user should remain in the search field
- Each filtered result should be keyboard-navigable with clear focus indicators
- "No results" state must be announced, not just visually displayed

### 6.5 Target Sizes and Spacing

Per WCAG 2.2 SC 2.5.8 (Target Size Minimum, Level AA):
- Interactive elements must be at least 24x24 CSS pixels
- Apple HIG recommends 44x44pt minimum touch targets
- Material Design 3 recommends 48x48dp touch targets
- Sufficient spacing between adjacent interactive elements to prevent accidental activation

### 6.6 Motion and Animation

- Respect `prefers-reduced-motion` media query on web
- On iOS, check `UIAccessibility.isReduceMotionEnabled`
- On Android, check `Settings.Global.ANIMATOR_DURATION_SCALE`
- When reduced motion is active, replace slide/bounce animations with instant state changes or simple cross-fades

---

## 7. Cross-Platform Adaptation

### 7.1 iOS

**System Settings (Settings.bundle)**
iOS allows apps to expose settings in the system Settings app via a `Settings.bundle`. This is appropriate for:
- Rarely changed configuration (server URLs, debug flags)
- Settings that must be accessible even when the app is not running
- Enterprise/MDM-managed settings

Apple HIG guidance: "Add only the most rarely changed options to the system-provided settings apps" because "people must switch away from their current context to adjust those settings."

**In-App Settings (Preferred for User-Facing Preferences)**
- Use grouped `UITableView` / `List` (SwiftUI) with `.insetGrouped` style
- Section headers and footers provide category labels and descriptions
- Use `UISwitch` / `Toggle` for boolean settings
- Use disclosure indicators (chevrons) for sub-screens
- Use `UISegmentedControl` or `Picker` for small option sets
- Place settings entry point as a gear icon in the navigation bar or tab bar

**Platform Conventions:**
- Settings icon: SF Symbol `gearshape` or `gearshape.fill`
- Navigation: push-based navigation controller stack
- Immediate apply for toggles; no global "Save" button
- "Done" button in navigation bar to dismiss modal settings

### 7.2 Android

**PreferenceScreen (Jetpack Preference Library)**
Android provides a dedicated `PreferenceScreen` API that handles:
- Automatic persistence to `SharedPreferences`
- Standard layouts for `SwitchPreference`, `ListPreference`, `EditTextPreference`, `SeekBarPreference`
- Category grouping via `PreferenceCategory`
- Search integration with the system Settings search

**Material Design 3 Guidelines:**
- Use `MaterialSwitch` for boolean settings (replaces legacy `SwitchCompat`)
- Labels left-aligned; secondary text below the label for descriptions
- Radio buttons presented in a dialog for discrete option sets
- Use `ListDetailPaneScaffold` for large-screen (tablet/foldable) adaptation
- Settings overview as primary list; subscreens as detail panes
- Do not let single-pane settings stretch to full width on large screens; set a max-width

**Platform Conventions:**
- Entry point: gear icon in the toolbar overflow menu or navigation drawer
- Always label the screen "Settings" (not "Options" or "Preferences")
- Use `Toolbar` with up-navigation arrow for sub-screens
- Persist changes immediately for toggles; use dialogs for multi-value selections

**Reference:** Material Design Settings Pattern (m2.material.io/design/platform-guidance/android-settings.html), Android Developer Settings Guide (developer.android.com/design/ui/mobile/guides/patterns/settings)

### 7.3 Web

**Settings Page (Full-Page Route)**
For SaaS and web apps with extensive settings:
- Dedicated `/settings` route with sidebar navigation
- Two-column layout: navigation sidebar (left), settings content (right)
- Responsive: sidebar collapses to a dropdown or stacked navigation on mobile viewports
- URL routing for each settings section (e.g., `/settings/notifications`) enables deep linking and browser back/forward

**Settings Modal/Dialog**
For simpler apps or quick preferences:
- Triggered from a gear icon or user avatar menu
- Modal overlay with tabbed navigation inside
- Appropriate when settings are few enough to fit in a single dialog
- Close button and Escape key to dismiss
- Focus trap within the modal for accessibility

**Tabbed Organization**
Most web apps use a vertical tab list on the left:
- Tabs are always visible, providing spatial orientation
- Active tab is highlighted; content area updates without full page reload
- Keyboard navigation: arrow keys move between tabs, Tab key moves into the content area

**Auto-Save vs. Explicit Save on Web:**
- Individual toggles and dropdowns: auto-save with debounce (300-500ms) and visual confirmation
- Form-based settings (profile info, SMTP config): explicit Save button
- Hybrid: auto-save for simple controls, Save button for form groups within the same page

### 7.4 Desktop (Electron/Native)

- macOS convention: Preferences window accessed via Cmd+, (comma)
- Windows convention: Settings in File > Options or Tools > Settings
- Desktop apps often support both GUI and config-file editing (VS Code model)
- Window-based preferences with toolbar icons for categories (macOS standard)

---

## 8. Decision Tree

### 8.1 In-App vs. System Settings

```
Is the setting changed frequently?
  YES --> In-app settings
  NO  --> Is it needed when the app is not running?
            YES --> System settings (Settings.bundle / Android system)
            NO  --> Is it an enterprise/MDM-managed setting?
                      YES --> System settings
                      NO  --> In-app settings (rarely-changed section)
```

### 8.2 Auto-Save vs. Explicit Save

```
Is the setting a single binary toggle or simple selection?
  YES --> Auto-save (instant apply)
  NO  --> Are multiple related fields changed together?
            YES --> Is the change reversible?
                      YES --> Auto-save with undo option
                      NO  --> Explicit save with confirmation
            NO  --> Does the setting have a preview/live effect?
                      YES --> Auto-save with live preview
                      NO  --> Explicit save
```

### 8.3 Flat vs. Grouped vs. Tabbed Organization

```
How many total settings does the app have?
  < 10  --> Flat scrollable list (single screen)
  10-30 --> Grouped list with section headers
  30-80 --> Tabbed/sidebar navigation with grouped sections
  > 80  --> Tabbed navigation + search (mandatory)
                + consider "Advanced" section or progressive disclosure
```

### 8.4 Confirmation Level for Destructive Actions

```
Is the action reversible?
  YES --> No confirmation needed; provide undo (toast/snackbar, 5-10s)
  NO  --> How severe are the consequences?
            LOW (single item, no data loss)
              --> Simple confirmation dialog with descriptive button
            MEDIUM (affects multiple items or other users)
              --> Confirmation dialog + consequence description
            HIGH (irreversible data loss, account deletion)
              --> Confirmation dialog + type-to-confirm + cooldown period
```

### 8.5 Search Necessity

```
Total number of settings > 15?
  YES --> Search is required
  NO  --> Search is optional but still beneficial if settings
          span multiple categories
```

---

## 9. Content and Copywriting Guidelines

**Setting Labels:** Use sentence case ("Auto-save documents"). Lead with the object or action. Keep under 40 characters. Always frame toggles positively ("Show status bar" not "Hide status bar").

**Setting Descriptions:** One to two lines maximum. Describe the effect, not the mechanism: "Your workspace members will see when you're online" not "Sends presence heartbeat to WebSocket server." Include consequence info for non-obvious settings.

**Section Headers:** Use standard labels: "General," "Appearance," "Notifications," "Privacy," "Account," "Advanced." Avoid creative names that sacrifice clarity.

**Confirmation Dialog Copy:** Title names the action ("Delete account?"). Body states consequences. Primary button repeats the action verb in red ("Delete Account"). Secondary button offers safe escape ("Cancel"). Never use Yes/No buttons.

---

## 10. Implementation and Performance Notes

**Settings Data Model** -- Each setting should define: key (unique identifier), type (toggle/select/slider/text/color), label, description, defaultValue, currentValue, scope (user/workspace/system), category, requiresRestart flag, isDestructive flag, and constraints.

**Settings Sync** -- Use last-write-wins for non-critical settings. Merge collection-type settings rather than replacing. Exclude device-specific settings (display density, font size) from sync. Store a schema version for migration across app updates.

**Performance** -- Settings screens should render within 100ms. Lazy-load heavy sub-screens. Cache values locally. For search, index labels and descriptions at build time; use client-side fuzzy matching; debounce input 200-300ms. For auto-save, debounce rapid changes 300-500ms before persisting; save text inputs on blur or after 1s of inactivity.

---

## References and Sources

### Design System Guidelines
- Apple Human Interface Guidelines -- Settings: https://developer.apple.com/design/human-interface-guidelines/patterns/settings/
- Material Design -- Settings Pattern: https://m2.material.io/design/platform-guidance/android-settings.html
- Material Design 3 -- Android: https://m3.material.io/develop/android/mdc-android
- Android Developer -- Settings Guide: https://developer.android.com/design/ui/mobile/guides/patterns/settings

### Research and Analysis
- Nielsen Norman Group -- Toggle Switch Guidelines: https://www.nngroup.com/articles/toggle-switch-guidelines/
- Nielsen Norman Group -- Confirmation Dialog: https://www.nngroup.com/articles/confirmation-dialog/
- Nielsen Norman Group -- Dangerous UX Proximity: https://www.nngroup.com/articles/proximity-consequential-options/
- Nielsen Norman Group -- 10 Usability Heuristics: https://www.nngroup.com/articles/ten-usability-heuristics/
- Nielsen Norman Group -- Checkboxes vs. Switches: https://www.nngroup.com/videos/checkboxes-vs-switches-forms/

### Industry Examples and Analysis
- Linear -- "Settings are not a design failure": https://linear.app/now/settings-are-not-a-design-failure
- VS Code -- User and Workspace Settings: https://code.visualstudio.com/docs/getstarted/settings
- Toptal -- How to Improve App Settings UX: https://www.toptal.com/designers/ux/settings-ux
- Smashing Magazine -- Managing Dangerous Actions in UIs: https://www.smashingmagazine.com/2024/09/how-manage-dangerous-actions-user-interfaces/

### Destructive Action Patterns
- UX Movement -- Destructive Actions That Prevent Data Loss: https://uxmovement.com/buttons/how-to-design-destructive-actions-that-prevent-data-loss/
- GitLab Pajamas -- Destructive Actions: https://design.gitlab.com/patterns/destructive-actions/

### Accessibility Standards
- WCAG 2.1: https://www.w3.org/TR/WCAG21/
- W3C WAI -- Form Instructions: https://www.w3.org/WAI/tutorials/forms/instructions/
- DubBot -- Accessible Toggle Switches: https://dubbot.com/dubblog/2024/visualizing-accessible-toggle-switches.html

### Micro-Interactions and Animation
- Cieden -- Toggle Switch UX Best Practices: https://cieden.com/book/atoms/toggle-switch/toggle-switch-ux-best-practices
- SetProduct -- Toggle Switch UI Design: https://www.setproduct.com/blog/toggle-switch-ui-design

### Product Documentation
- Notion -- Account Settings: https://www.notion.com/help/account-settings
- Notion -- Workspace Settings: https://www.notion.com/help/workspace-settings
- Slack -- Sidebar Preferences: https://slack.com/help/articles/212596808-Adjust-your-sidebar-preferences
- Apple -- Settings.bundle: https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/UserDefaults/Preferences/Preferences.html
