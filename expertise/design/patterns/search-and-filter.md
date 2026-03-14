# Search and Filter Patterns

> **Module Type:** Pattern
> **Domain:** UI/UX Design Systems
> **Last Updated:** 2026-03-07
> **Sources:** Algolia, Baymard Institute, Nielsen Norman Group, W3C WAI-ARIA, Apple HIG, Material Design, Smashing Magazine

---

## Quick Reference Checklist

### Search Essentials
- [ ] Search bar is prominent, full-width or near-full-width, with placeholder text
- [ ] Autocomplete provides 6-8 query suggestions + 4-6 result previews
- [ ] Typo tolerance and fuzzy matching are enabled
- [ ] Recent searches are persisted and displayed on focus
- [ ] Clear button (x) appears when input has content
- [ ] Search results display a count ("42 results for 'widget'")
- [ ] No-results state offers actionable alternatives, not a dead end
- [ ] Search is case-insensitive
- [ ] Keyboard shortcut (Cmd+K or /) triggers search focus
- [ ] Loading indicator appears for searches exceeding 200ms

### Filter Essentials
- [ ] Applied filters are visible as removable chips above results
- [ ] "Clear all" button is always accessible
- [ ] Filter counts show number of matching results per option
- [ ] Filters update results within 200ms (instant) or use "Apply" button (batch)
- [ ] Filters persist across navigation (back button, page refresh)
- [ ] Zero-result filter options are disabled or hidden, not clickable
- [ ] Mobile filters open in a full-screen modal or bottom sheet
- [ ] Sort is separate from filter, not conflated
- [ ] URL reflects active filters for shareability
- [ ] Saved search/filter presets are available for repeat workflows

### Accessibility Essentials
- [ ] Search input uses `role="search"` or is inside `<search>` landmark
- [ ] Autocomplete uses `role="combobox"` with `aria-expanded`, `aria-controls`
- [ ] Active suggestion uses `aria-activedescendant`
- [ ] Result count changes announced via `aria-live="polite"` region
- [ ] Filter groups use `role="group"` with `aria-labelledby`
- [ ] All interactions are keyboard-operable (Tab, Enter, Escape, Arrow keys)
- [ ] Focus is trapped inside modal filters; Escape closes and restores focus
- [ ] Color is not the only indicator for active filters

---

## 1. Pattern Anatomy

### 1.1 Search Types

#### Global Search
A single, persistent input querying across all content types. Lives in the top navigation bar, always visible or one click away. Searches across all entities (pages, users, files, settings), returns grouped results by category. Algolia: search box should "visually stand out, be full-width, and include a placeholder." Standard placement: upper-right or top-center. Baymard: search users convert at 1.8x the rate of browse-only users.

**When to use:** Diverse content types, large datasets, or when users cannot predict where content lives.

#### Scoped Search
Search constrained to a specific section, category, or entity type. Shows scope indicator ("in: #design-team"), may offer scope switching. Apple HIG: "Favor improving search results over including a scope bar."

**When to use:** Users already in a clear context expecting confined results (e.g., within a Slack channel, a GitHub repo).

#### Command Palette (Cmd+K)
Modal search for both content and actions -- not just finding things but doing things. Triggered via keyboard shortcut (Cmd+K, Cmd+E, Ctrl+P). Centered overlay with input and scrollable list. Supports fuzzy matching, context-aware suggestions, and shows keyboard shortcuts alongside commands for education.

| App | Shortcut | Scope |
|-----|----------|-------|
| Linear | Cmd+K | Issues, projects, actions, settings |
| Notion | Cmd+K | Pages, actions, recently visited |
| Figma | Cmd+P | Commands, plugins, menu items |
| VS Code | Cmd+Shift+P | All commands, settings, files |
| Superhuman | Cmd+K | Email actions, navigation, compose |
| Slack | Cmd+K | Channels, DMs, navigation |
| GitHub | Cmd+K | Repos, files, commands, users |

**Design principles (Superhuman):** Bind shortcut at top level; toggle on same shortcut; provide context-aware suggestions; use fuzzy search; show recent/frequent commands first.

#### Inline Search
Embedded within a content area, filtering visible items in real time without navigating away. Results update character-by-character (debounced 150-300ms). No separate results page -- non-matching items disappear or dim. Client-side filtering for small datasets.

**When to use:** Tables, dropdown lists, settings panels, or bounded lists under ~1,000 items.

---

### 1.2 Filter Types

#### Faceted Filters
Multi-dimensional filtering across independent categories. OR logic within a group, AND logic across groups. Each option shows result count. 5-7 facets per page (Baymard). "Show more" or search-within-filter for large facets. Collapsible groups, most-used expanded by default. 10% higher conversion vs. traditional filtering. Response times under 200ms.

**NNG:** "Develop filter categories and values that are appropriate, predictable, free of jargon, and prioritized."

#### Toggle Filters
Binary on/off for boolean attributes ("In stock," "Free shipping," "Verified"). Immediate effect, compact footprint in a horizontal bar. Keep to 3-5 maximum.

#### Range Sliders
Dual-handle slider for min/max (price, rating, size). Pair with numeric text inputs for precision and accessibility. Histogram overlay showing distribution. Debounced 300-500ms. Use `role="slider"` with `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext`. Always provide companion text inputs for keyboard/screen reader users.

#### Date Range Filters
Calendar picker for custom ranges plus preset shortcuts ("Today," "Last 7 days," "Last 30 days," "This quarter," "Custom"). Support relative vs. absolute dates. Clear start/end display in filter chip.

#### Tag-Based Filters
Typeahead input for selecting/creating tags. Render as removable, color-coded chips. Multi-select with OR logic. Combine with other filter types. Best for user-generated categories and non-hierarchical attributes.

---

### 1.3 Sort Patterns

Sort is separate from filtering but co-located. Common options: Relevance (default for search), Newest/Oldest, Price Low-High/High-Low, Popularity, Rating, Alphabetical, Distance. Sort is single-select (dropdown or segmented control, not checkboxes). Show active criterion: "Sorted by: Relevance." Never conflate sort with filter.

### 1.4 Saved Searches

- **Named saved searches:** User saves query + filters with a custom name
- **Recent searches:** Auto-stores last 5-10 queries, shown on focus
- **Filter presets:** System-defined combinations ("Budget-friendly," "New arrivals")
- **URL-based persistence:** State encoded in URL for bookmarking and sharing

Smashing Magazine: "Allowing users to save a query for reuse is recommended when users regularly perform a series of filters."

---

## 2. Best-in-Class Examples

### 2.1 Algolia (Search Infrastructure)
Sub-50ms InstantSearch with character-by-character updates. Autocomplete shows 6-8 query suggestions + 4-6 result previews. Federated search groups results by type (products, articles, FAQs). Built-in typo tolerance. Highlights matching portions of suggestions.

**Takeaway:** Show results before the user finishes typing. Reduces search abandonment by 30%+.

### 2.2 Airbnb (Travel Marketplace)
Progressive disclosure: destination, then dates, then guests. Map-integrated results update with filters. Price histogram on range filter. Contextual filters change by listing type. Personalized suggestions from past behavior.

**Takeaway:** Guide users through filters in order of impact rather than presenting all simultaneously.

### 2.3 Amazon (E-Commerce)
Left sidebar faceted navigation with category hierarchy. Result counts on every filter option. Autocomplete with product thumbnails and category suggestions. Department scoping narrows subsequent filters. Breadcrumb trail for backtracking.

**Takeaway:** For large catalogs, use hierarchical categories alongside flat filters. Always show result counts per option.

### 2.4 Linear (Project Management)
Cmd+K palette with fuzzy search across issues, projects, views, actions. Visual filter builder with boolean logic ("Status is In Progress AND Assignee is me"). Filters persist in saved, shareable views. Fully keyboard-driven. "Group by" and "Sort by" separated from filters.

**Takeaway:** Provide both preset filters and a composable filter builder. Make filters persistent and URL-shareable.

### 2.5 Notion (Knowledge Management)
Cmd+K across all pages and content. Shows page hierarchy for context. Database views support saved filter/sort combos. Inline "/" palette for block-level actions. Recent pages on search focus.

**Takeaway:** Separate navigation search (Cmd+K) from action search (/) when your app has both content and editing dimensions.

### 2.6 Spotify (Music Streaming)
AI-powered autocomplete after 2-3 characters. Results in horizontal carousels by type: Artists, Songs, Albums, Playlists, Podcasts. Genre/mood browsing as alternative. Visual results with album art. Recent searches prominent on focus.

**Takeaway:** For multi-type content, group results by category with visual thumbnails for scan speed.

### 2.7 Figma (Design Tool)
Cmd+P for Quick Actions (commands, plugins). Ctrl+F for in-canvas search. Asset panel search for components/styles. Multi-scope search: canvas content, design assets, and application commands each optimized.

**Takeaway:** Complex tools benefit from multiple purpose-built search interfaces rather than one universal search.

### 2.8 GitHub (Developer Platform)
Cmd+K palette with scoped search (repo, org, global). Advanced syntax: `is:open author:@me label:bug`. Code search with regex. Saved queries. Context-aware scope narrowing. Filter sidebar with facets.

**Takeaway:** Support structured query language for power users alongside GUI filters for discoverability.

---

## 3. User Flow Mapping

### 3.1 Search Flow

1. **Focus** -- Show recent searches / popular queries / empty state
2. **Type** -- Debounce 150-300ms, send query
3. **Suggest** -- Display autocomplete: 6-8 query suggestions, 4-6 result previews, category suggestions
4. **Select** -- User picks suggestion (navigate to item) OR presses Enter (full results page)
5. **Refine** -- Results page with filters, sort, count; user iterates

### 3.2 Filter Flow

**Instant path:** Select filter -> debounce 200ms -> update results + count -> show filter chip
**Batch path:** Select multiple filters -> tap "Show N results" -> update results -> close modal (mobile)
**Remove:** Click "x" on chip or "Clear all" -> update results

### 3.3 Edge Cases

#### Typos and Misspellings
Fuzzy matching with Levenshtein distance <= 2. Show "Did you mean: [corrected]?" or auto-correct with "Showing results for [corrected]. Search instead for [original]?" Baymard: 58% of e-commerce sites fail on abbreviation/symbol searches.

#### Empty Results
Never show a blank page. Provide: spelling corrections, related/popular searches, broadened search (remove least impactful filter), recently viewed items. Specific copy: "No results for 'kiwi framwork'. Try 'kiwi framework' or browse [Popular Categories]."

#### Slow Search (> 500ms)
Skeleton/shimmer loading state immediately. Progress indicator at 500ms. "Taking longer than usual" message at 3s with cancel option. Cache frequent queries. Prefetch likely autocomplete selections.

#### Very Long Result Sets (1,000+ results)
Pagination or infinite scroll with count ("Showing 1-20 of 4,382"). Encourage refinement: "Too many results? Try adding filters." Virtual scrolling for 200+ visible items. Group results by category.

#### Special Characters and Operators
Strip/escape special characters by default. Support quoted phrases ("exact match") and operators (AND, OR, NOT) for advanced users. Document syntax in a help tooltip.

---

## 4. Micro-Interactions

### 4.1 Search Expand Animation
Icon expands into full input field. Duration: 200-300ms, ease-out. Icon slides left, width animates from 0 to target. Placeholder fades in after expansion (50ms delay). Focus set automatically. On mobile: full-screen SearchView with back arrow replacing search icon. Avoid pushing nav elements off-screen -- use overlay.

### 4.2 Autocomplete Dropdown
Slides down or fades in (150ms, ease-out). Rows highlight on hover/keyboard. Matching text bolded or color-highlighted. Category headers in muted style. Max height 400-500px with internal scroll. Shadow for visual separation. Keys: Arrow Down/Up navigate, Enter selects, Escape closes, Tab accepts inline completion.

### 4.3 Filter Chip Addition/Removal
**Add:** Chip scales 0-100% (150ms, spring). Existing chips slide right. Brief highlight flash.
**Remove:** Chip scales 100-0% (120ms, ease-in). Remaining chips slide left. Results update simultaneously.
**Anatomy:** Category + value label ("Color: Blue"), "x" button (min 44x44px touch target), distinct background.

### 4.4 Result Highlighting
Matched text gets background highlight (yellow/amber at 30% opacity) or bold treatment. Highlight each matched term independently for multi-word queries. In autocomplete: user input normal weight, suggested completion bold (Algolia pattern).

### 4.5 Result Count Animation
Ticker effect: old number scrolls up, new scrolls down (300-500ms). Large changes use ticker, small changes use crossfade. Show "updating..." if query exceeds 200ms.

### 4.6 Filter Panel Open/Close
**Desktop:** Sidebar slides in from left (250ms, ease-out), content area adjusts, icon rotates.
**Mobile:** Bottom sheet slides up (300ms, spring) or modal fades in. Backdrop overlay (200ms). "Show N results" fixed at bottom. Swipe-to-dismiss with velocity threshold.

---

## 5. Anti-Patterns

### 5.1 No Autocomplete
**Problem:** Forcing users to type complete queries and press Enter before seeing any results. Users must guess the exact terminology.
**Impact:** Increases search abandonment by 30%+ (Algolia). Users who misspell or use different terminology get zero results.
**Fix:** Implement search-as-you-type with query suggestions and result previews. Even basic prefix matching is better than nothing.

### 5.2 Search Without a Clear Button
**Problem:** No visible "x" button to clear the search input. Users must manually select all text and delete it.
**Impact:** Adds friction to every search iteration. Particularly painful on mobile where text selection is clumsy.
**Fix:** Show a clear (x) button inside the input whenever it contains text. On clear, return to the default view (not a blank results page).

### 5.3 Filters That Reset on Navigation
**Problem:** User applies filters, clicks into a result, presses back, and all filters are gone.
**Impact:** Users must reapply 3-5 filters every time they drill into a result. This is one of the most complained-about UX issues in e-commerce (Baymard).
**Fix:** Persist filter state in the URL (query parameters) and/or session storage. Filters must survive back-button navigation.

### 5.4 No Search Result Count
**Problem:** Showing results without telling the user how many there are.
**Impact:** Users cannot gauge whether to refine their search or browse results. No feedback on filter effectiveness.
**Fix:** Always display the total result count: "42 results for 'wireless keyboard'." Update the count in real time as filters change.

### 5.5 Case-Sensitive Search
**Problem:** "iPhone" returns results but "iphone" returns nothing.
**Impact:** Users never expect case sensitivity in a UI search. This looks like a bug.
**Fix:** Normalize search queries to lowercase before matching. Case-sensitive search should only exist in developer tools with an explicit toggle.

### 5.6 No Recent Searches
**Problem:** Search input shows nothing on focus. Users must remember and retype previous queries.
**Impact:** Frequent users waste time re-entering the same searches. New users miss the opportunity to see what is searchable.
**Fix:** Display the last 5-10 searches on input focus (before typing). Include a "Clear history" option for privacy.

### 5.7 Filter Options That Yield Zero Results
**Problem:** User selects a filter combination and gets "No results found." The filter options themselves should have prevented this.
**Impact:** Users lose trust in the filter system. They cannot predict which combinations work.
**Fix:** Show result counts next to every filter option. Disable or visually dim options that would produce zero results given the current filter state. Dynamically update counts as filters change.

### 5.8 Search Icon Without Visible Input
**Problem:** Hiding the search bar behind a magnifying glass icon with no visible text input.
**Impact:** NNG found that replacing a search link with a visible search box increased search usage by 91%. Hidden search signals that search is a secondary feature.
**Fix:** On desktop, always show the search input field. On mobile, the icon-to-input pattern is acceptable if it expands on tap with a smooth animation.

### 5.9 No Typo Tolerance
**Problem:** "recieve" returns no results instead of showing results for "receive."
**Impact:** Users blame themselves or the product. Search feels broken.
**Fix:** Implement fuzzy matching with Levenshtein distance. Show "Did you mean: receive?" for ambiguous corrections. Auto-correct obvious single-character errors.

### 5.10 Conflating Search and Filter
**Problem:** Putting search functionality inside the filter panel, or making users choose between searching OR filtering rather than combining both.
**Impact:** Users who search cannot filter results. Users who filter cannot search within filtered results.
**Fix:** Search and filter should be independent, composable operations. A user should be able to search for "blue dress" and then filter by size, price, and brand.

### 5.11 Auto-Submitting on Every Keystroke Without Debounce
**Problem:** Firing a search request on every single keystroke, causing flickering results, high server load, and race conditions.
**Impact:** Results flash and change faster than users can read. Network requests may return out of order, showing stale results.
**Fix:** Debounce input by 150-300ms. Cancel in-flight requests when a new query is issued. Use request sequencing to prevent stale results.

### 5.12 Full-Page Reload on Filter Change
**Problem:** Every filter selection causes a full page reload, scrolling users back to the top.
**Impact:** Users lose their scroll position and context. Filter exploration becomes painfully slow.
**Fix:** Use AJAX/fetch to update results without a full page reload. Maintain scroll position. If a full reload is necessary, scroll to the results section, not the top of the page.

### 5.13 Hiding Active Filter State
**Problem:** Filters are applied but there is no visible indication of which filters are active.
**Impact:** Users do not understand why results seem limited. They may not realize they have active filters from a previous session.
**Fix:** Display active filters as chips above results. Highlight active filter controls in the sidebar. Show "N filters active" badge on the mobile filter button.

### 5.14 Using Jargon in Filter Labels
**Problem:** Filter labels use internal terminology ("SKU type," "Taxonomy Level 2") instead of user language.
**Impact:** Users do not understand what the filters mean. They avoid using them entirely.
**Fix:** Use plain language tested with real users. NNG: "Users should immediately understand what the facets represent when skimming the options."

### 5.15 Pagination Resetting on Filter Change
**Problem:** User is on page 5 of results, applies a filter, and stays on "page 5" of the now-smaller result set (which may be empty or near-empty).
**Impact:** User sees no results or irrelevant results after filtering, even though matches exist.
**Fix:** Reset to page 1 whenever any filter is applied or removed. Preserve pagination state only across sort changes.

### 5.16 No Keyboard Shortcut for Search
**Problem:** Users must click the search bar with a mouse. No keyboard shortcut to focus it.
**Impact:** Keyboard-first users and power users are slowed down. Accessibility is diminished.
**Fix:** Implement "/" or "Cmd+K" to focus the search input. Show the shortcut hint inside the placeholder text or as a badge on the search bar (e.g., "Search... Cmd+K").

---

## 6. Accessibility

### 6.1 Search Landmark Role

```html
<search>
  <form role="search" aria-label="Site search">
    <label for="site-search" class="visually-hidden">Search</label>
    <input id="site-search" type="search" placeholder="Search..." autocomplete="off" />
    <button type="submit" aria-label="Submit search">
      <svg aria-hidden="true"><!-- icon --></svg>
    </button>
  </form>
</search>
```

Use `role="search"` or `<search>` landmark. Provide `<label>` (visible or visually hidden). Use `type="search"` for native clear button. Multiple search forms need unique `aria-label` values.

### 6.2 Autocomplete ARIA Patterns (Combobox)

```html
<div role="combobox" aria-expanded="true" aria-haspopup="listbox" aria-owns="search-results">
  <input type="search" aria-autocomplete="list" aria-controls="search-results"
         aria-activedescendant="result-3" />
</div>
<ul id="search-results" role="listbox" aria-label="Search suggestions">
  <li id="result-1" role="option">Suggestion 1</li>
  <li id="result-3" role="option" aria-selected="true">Suggestion 3</li>
</ul>
```

**Required attributes:** `role="combobox"` on container, `aria-expanded` (true/false), `aria-haspopup="listbox"`, `aria-controls` pointing to popup ID, `aria-activedescendant` pointing to focused option, `aria-autocomplete` ("list", "inline", or "both"), `role="listbox"` on popup, `role="option"` on each suggestion, `aria-selected` on active option.

**Autocomplete variants (W3C WAI):** `"none"` = popup of predefined values; `"list"` = filtered suggestions; `"inline"` = completion text in input; `"both"` = inline + popup list.

### 6.3 Filter Checkbox Groups

```html
<fieldset>
  <legend>Brand</legend>
  <label><input type="checkbox" name="brand" value="apple" /> Apple (42)</label>
  <label><input type="checkbox" name="brand" value="samsung" /> Samsung (38)</label>
</fieldset>
```

Group filters with `<fieldset>`/`<legend>` or `role="group"` with `aria-labelledby`. Each option needs a visible `<label>`. Disabled options use `aria-disabled="true"` with explanation. State changes announced via label text.

### 6.4 Result Count Announcements

```html
<div aria-live="polite" aria-atomic="true" class="visually-hidden">
  42 results found for "wireless keyboard"
</div>
<p class="results-count">42 results for "wireless keyboard"</p>
```

Use `aria-live="polite"` + `aria-atomic="true"` on a visually hidden region to announce count changes without interrupting speech. Keep concise: "42 results" not verbose sentences. Debounce during rapid filter changes (500ms). Announce no-results with guidance.

### 6.5 Keyboard Navigation

| Context | Key | Action |
|---------|-----|--------|
| Search input | Enter | Submit / select suggestion |
| Search input | Escape | Clear or close dropdown |
| Search input | Down/Up Arrow | Navigate suggestions |
| Search input | Tab | Next focusable element |
| Results list | Enter | Open focused result |
| Results list | Escape | Return to search input |
| Results list | Home/End | First/last result |
| Filters | Space | Toggle checkbox |
| Filters | Enter | Activate button / expand group |
| Filters | Escape | Close modal, restore focus |
| Filters | Arrow keys | Navigate radio group |

### 6.6 Focus Management

- Search overlay open: focus to input. Dropdown close: focus stays on input.
- Filter modal open: focus to first interactive element. Modal close: focus returns to trigger.
- Trap focus within modal filter panels (Tab must not escape to background).
- Provide skip link past filter controls to results.

---

## 7. Cross-Platform Adaptation

### 7.1 iOS

Search bar embedded in navigation bar via `UISearchController`, hidden under title by default. Pull down to reveal. Tapping expands, dims background, shows Cancel button. Optional scope bar (segmented control) below for categories. Two styles: prominent (tinted background) and minimal (blends with interface). Supports search tokens (typed filter chips in the search bar).

**Filters:** Horizontal scrollable chips below search bar. Tap chip for contextual menu. Bottom sheet (medium/large detents) for complex panels. "Done"/"Apply" to confirm.

### 7.2 Android (Material Design 3)

Two components: SearchBar (persistent, collapsed, rounded text field) and SearchView (expanded, full-screen). Tapping bar morphs to view with container transform animation. Leading icon transitions: search icon to back arrow. Full screen on phones, overlay on tablets. Supports voice input.

**Filters:** Horizontal scrollable Material Chips. ModalBottomSheet for complex panels. "Show results" button with count at bottom.

### 7.3 Web

**Command palette:** Centered modal (500-600px), dark backdrop, input + scrollable list, keyboard-first, grouped by category, fuzzy search with highlighting.

**Faceted sidebar:** Persistent left sidebar (220-280px), collapsible groups, "Show more" for 5-7+ options, sticky independent scroll, chips above results grid.

**Responsive behavior:**
| Breakpoint | Search | Filters |
|------------|--------|---------|
| Desktop (> 1024px) | Visible search bar in header | Persistent sidebar + chip row |
| Tablet (768-1024px) | Visible bar, may shrink | Collapsible sidebar or top bar chips |
| Mobile (< 768px) | Icon expanding to overlay | Button opening full-screen modal |

**URL state:** Encode query + filters in URL params (`?q=keyboard&brand=apple&price=50-200`). Support back/forward navigation and deep linking.

---

## 8. Decision Tree

### 8.1 Global Search vs. Scoped Search

| Condition | Recommendation |
|-----------|---------------|
| Multiple content types, user looks across all | GLOBAL SEARCH with category tabs in results |
| Multiple types, user always in clear context | SCOPED SEARCH with "Search everywhere" option |
| Multiple types, context varies | GLOBAL SEARCH with scope selector |
| Single content type | SCOPED SEARCH (implicit scope) |

**Rule of thumb:** Default to global search unless users consistently work in a single scope.

### 8.2 Instant Filters vs. Apply Button

| Condition | Recommendation |
|-----------|---------------|
| Fast queries (< 200ms), 1-3 filters | INSTANT FILTERS |
| Fast queries, 4+ filters | INSTANT FILTERS with undo support |
| Slow queries (> 500ms), desktop | INSTANT with debounce + skeleton loading |
| Slow queries, mobile | APPLY BUTTON ("Show 42 results") |

**Rule of thumb:** Instant on desktop when performance allows. Apply button on mobile to prevent reflows.

### 8.3 Command Palette vs. Search Bar

| Condition | Recommendation |
|-----------|---------------|
| Power users, many commands/actions | COMMAND PALETTE (Cmd+K) + search bar for content |
| Power users, few actions | SEARCH BAR with Cmd+K focus shortcut |
| General consumers | SEARCH BAR (prominent, visible). Palette optional. |

**Rule of thumb:** Palettes are essential for productivity tools (Linear, Figma, VS Code). Consumer products use a visible search bar as primary.

### 8.4 Faceted Sidebar vs. Horizontal Filter Bar

| Dimensions | Desktop | Mobile |
|------------|---------|--------|
| 1-4 | Horizontal filter bar (chips/dropdowns) | Horizontal chips or dropdown |
| 5-10 | Faceted sidebar | Full-screen modal |
| 10+ | Sidebar with collapsible groups + search-within-filter | Multi-step modal |

### 8.5 Search Results Page vs. Inline Results

| Expected results | Recommendation |
|-----------------|---------------|
| < 50, comparison needed | INLINE RESULTS (filter current view) |
| < 50, no comparison | Either approach |
| 50-1,000 | RESULTS PAGE with pagination/infinite scroll |
| 1,000+ | RESULTS PAGE with mandatory filters, encourage narrowing |

---

## Implementation Reference

### Debounce Timing Guidelines

| Interaction | Debounce | Rationale |
|-------------|----------|-----------|
| Search-as-you-type query | 150-300ms | Balance between responsiveness and server load |
| Filter checkbox toggle | 0-200ms | Instant feels best; debounce if queries are slow |
| Range slider drag | 300-500ms | Wait for user to finish adjusting |
| Sort selection | 0ms | Immediate -- single action, clear intent |
| Clear all filters | 0ms | Immediate -- destructive action, user expects reset |

### Result Count Display Formats

| Context | Format | Example |
|---------|--------|---------|
| Search results | "{count} results for '{query}'" | "42 results for 'wireless keyboard'" |
| Filtered list | "{count} {items}" | "42 products" |
| Filter option | "{label} ({count})" | "Apple (42)" |
| Mobile apply button | "Show {count} results" | "Show 42 results" |
| Empty results | "No results for '{query}'" | "No results for 'xyzzy'" |
| Loading | "Searching..." or skeleton | -- |

### URL Parameter Conventions

```
# Single-value filter
?brand=apple

# Multi-value filter (OR logic within group)
?brand=apple,samsung,sony

# Range filter
?price=50-200

# Search query
?q=wireless+keyboard

# Sort
?sort=price_asc

# Pagination
?page=2&per_page=20

# Combined
/products?q=keyboard&brand=apple,logitech&price=50-200&sort=rating&page=1
```

### Performance Targets

| Metric | Target | Degraded | Unacceptable |
|--------|--------|----------|--------------|
| Autocomplete response | < 100ms | 100-300ms | > 500ms |
| Search results load | < 200ms | 200-500ms | > 1000ms |
| Filter update | < 200ms | 200-500ms | > 1000ms |
| Keyboard shortcut response | < 50ms | 50-100ms | > 200ms |
| Animation frame rate | 60fps | 30fps | < 30fps |

### Search Analytics to Track

| Metric | What it reveals |
|--------|----------------|
| Search exit rate | % of users who leave after searching -- indicates poor result quality |
| Zero-result rate | % of queries returning no results -- surface content gaps or typo issues |
| Click-through position | Which result position users click -- validates ranking quality |
| Query refinement rate | % of users who modify their query -- may indicate poor initial results |
| Filter usage rate | Which filters are most/least used -- inform filter prioritization |
| Time to first click | How long users scan before clicking -- lower is better |
| Autocomplete acceptance rate | % of users selecting a suggestion -- validates suggestion quality |
| Search-to-conversion rate | % of searchers who complete a goal -- the ultimate success metric |

### Common Search Query Patterns to Support

| Pattern | Example | Implementation |
|---------|---------|---------------|
| Natural language | "blue dress under $50" | Parse intent, map to filters |
| Category + attribute | "laptops 16gb ram" | Detect category, extract attributes |
| Exact phrase | "air jordan 1 retro" | Quoted phrase matching |
| Negation | "headphones -wireless" | Exclude term from results |
| Comparison | "iphone vs samsung" | Detect comparison intent, show side-by-side |
| Question | "what size battery for honda civic" | Extract entity, search knowledge base |
| Misspelling | "wireles keybord" | Fuzzy match, suggest correction |
| Abbreviation | "4k tv 55in" | Expand abbreviations, normalize units |

### Filter State Management Patterns

**Client-side state (SPA):**
- Store filter state in URL search params for shareability and back-button support
- Use `URLSearchParams` API or a router-integrated state manager
- Sync URL state bidirectionally: URL change updates UI, UI change updates URL
- Serialize complex filters (date ranges, nested selections) as compact strings

**Server-side state:**
- Accept filter params as query string or POST body
- Return result count in response headers or body for "Show N results" buttons
- Support pagination cursors alongside filter params
- Cache filtered result sets with filter-hash keys for repeat queries

**Hybrid (recommended for large apps):**
- URL holds the serialized filter state (source of truth)
- Client-side cache holds recent result sets keyed by filter hash
- Server-side processes queries and returns paginated results
- Optimistic UI: update filter chips immediately, show skeleton for results

---

## Sources

- [Baymard Institute -- E-Commerce Search Usability Research](https://baymard.com/research/ecommerce-search)
- [Baymard Institute -- Mobile UX Trends 2025](https://baymard.com/blog/mobile-ux-ecommerce)
- [Nielsen Norman Group -- Search Usability Reports](https://www.nngroup.com/reports/topic/search/)
- [NNG -- Search: Visible and Simple](https://www.nngroup.com/articles/search-visible-and-simple/)
- [NNG -- Helpful Filter Categories and Values](https://www.nngroup.com/articles/filter-categories-values/)
- [Algolia -- Best Practices for Site Search UI Design Patterns](https://www.algolia.com/blog/ux/best-practices-for-site-search-ui-design-patterns)
- [Algolia -- Autocomplete Beyond Search](https://www.algolia.com/blog/ux/autocomplete-beyond-search-engaging-users-with-next-level-ux/)
- [Algolia -- Search Filter UX Best Practices](https://www.algolia.com/blog/ux/search-filter-ux-best-practices/)
- [Algolia -- Mobile Search UX Best Practices](https://www.algolia.com/blog/ux/mobile-search-ux-best-practices/)
- [W3C WAI -- Combobox Pattern (ARIA APG)](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
- [W3C WAI -- Editable Combobox With List Autocomplete](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/)
- [Apple -- Human Interface Guidelines: Search Fields](https://developers.apple.com/design/human-interface-guidelines/components/navigation-and-search/search-fields)
- [Material Design 3 -- Search Guidelines](https://m3.material.io/components/search/guidelines)
- [Material Design -- Search Bar (Android)](https://github.com/material-components/material-components-android/blob/master/docs/components/Search.md)
- [Superhuman -- How to Build a Remarkable Command Palette](https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/)
- [Smashing Magazine -- Designing Filters That Work](https://www.smashingmagazine.com/2021/07/frustrating-design-patterns-broken-frozen-filters/)
- [Pencil & Paper -- Filter UX Design Patterns & Best Practices](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-filtering)
- [Mobbin -- Command Palette UI Design](https://mobbin.com/glossary/command-palette)
- [DesignMonks -- Master Search UX in 2026](https://www.designmonks.co/blog/search-ux-best-practices)
