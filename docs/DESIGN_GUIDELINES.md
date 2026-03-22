# Design guidelines

## 1. Design principles

- **Clarity over decoration.** Prefer white cards, subtle borders, and readable chart defaults over heavy chrome.
- **Consistent wayfinding.** Primary navigation uses pill `NavLink` controls; active state is unambiguous.
- **Trust and density.** Analyst users tolerate information-rich screens; use hierarchy (section labels, accordions) to avoid flat walls of text.
- **Accessible defaults.** Interactive elements remain keyboard-focusable; dialogs set `aria-modal` and labels where implemented.

## 2. Typography

| Use | Stack | Notes |
|-----|-------|-------|
| **Display / product title** | `font-display` → **Outfit** (fallback Inter) | Header product name |
| **Body** | **Inter**, **DM Sans**, system-ui | Configured in `tailwind.config.js` |

Sizes follow Tailwind utilities (`text-xs` for meta labels, `text-sm`–`text-base` for body, `text-lg`+ for page titles inside cards).

## 3. Color system (app shell)

The main application uses **Tailwind slate** neutrals with **red** as the primary accent (active nav, primary buttons).

| Token / pattern | Typical class | Usage |
|-----------------|---------------|--------|
| Page background | `bg-slate-100` | Layout canvas |
| Surfaces | `bg-white`, `border-slate-200` | Cards, modals |
| Primary text | `text-slate-900` | Headings |
| Secondary text | `text-slate-600`, `text-slate-500` | Descriptions, hints |
| Muted label | `text-slate-400`, uppercase tracking | Section kicker labels |
| **Primary CTA / active nav** | `bg-red-600`, `text-white`, `hover:bg-red-700` | Selected route, refresh, key actions |
| Secondary button | `border-slate-200`, `bg-white`, `hover:bg-slate-50` | Neutral actions |
| Destructive / emphasis border | `border-red-200`, `bg-red-50` | Stepper “Previous” affordance, highlights |

### Extended palette (Tailwind theme)

Defined in `tailwind.config.js` for optional use:

| Name | Scale | Example hex | Suggested use |
|------|-------|-------------|----------------|
| **ink** | 950–700 | `#0c1222` … `#243056` | Deep text or hero contrast (sparingly) |
| **sea** | 500–700 | `#2dd4bf` … `#0d9488` | Secondary accents (education charts sometimes use teal family in Recharts) |
| **coral** | 500–600 | `#fb7185` … `#f43f5e` | Warm accent alternative |

Charts use **inline hex strokes** per series in page-specific code (not centralized tokens); when adding series, pick distinct hues and test in light mode.

## 4. Component patterns

| Pattern | Implementation hints |
|---------|----------------------|
| **Card** | `rounded-2xl border border-slate-200 bg-white p-4 shadow-sm` (`.glass` utility in `index.css`) |
| **Accordion sections** | `AccordionSection` on dashboard — title row + download hook |
| **Tables** | Sortable headers where implemented (`SortableTh`); fullscreen tables use `.cap-fs-table-shell` or `.cap-viz-fs-table` |
| **Charts** | Recharts inside `ResponsiveContainer`; tooltips via `ChartTooltipShell` pattern |
| **Full screen** | `ChartTableToggle` fixed overlay; class `cap-viz-fullscreen` scales tick/legend fonts |
| **Toasts** | Bottom-right, single latest result; slide-in animation `.toast-slide-in` |
| **API debug** | Bottom-left chip expanding to full transport log |

## 5. Feature-specific themes

### PESTEL dimension colors (`pestelTheme.ts`)

| Dimension | Header | Tint |
|-----------|--------|------|
| POLITICAL | `#1e3a5f` | `#e8eef5` |
| ECONOMIC | `#2d5a4c` | `#e9f2ef` |
| SOCIOCULTURAL | `#9a7340` | `#f4efe6` |
| TECHNOLOGICAL | `#b8573a` | `#f7ece8` |
| ENVIRONMENTAL | `#6b2d38` | `#f0e8ea` |
| LEGAL | `#4a4568` | `#ebeaf2` |

SWOT uses paired headers/tints (strengths green family, weaknesses rust, opportunities blue, threats magenta-red).

### Porter force accents (`porterTheme.ts`)

| Accent key | Color | Force |
|------------|-------|-------|
| `threat_new_entry` | `#dc2626` | Threat of new entry |
| `supplier_power` / `buyer_power` | `#2563eb` | Supplier / buyer power |
| `threat_substitutes` | `#0ea5e9` | Substitutes |
| `rivalry` | `#64748b` | Rivalry |

## 6. Spacing and layout

- Horizontal page padding: `px-3 sm:px-4 lg:px-6 xl:px-8` on main content (matches `Layout.tsx`).
- Vertical rhythm: `space-y-4`–`space-y-8` between major blocks.
- Sticky header: `sticky top-0 z-30` with `backdrop-blur` for readability over scrolling content.

## 7. Motion

- Keep transitions **short** (`transition`, `duration` defaults); toast uses `@keyframes cap-toast-in`.
- Avoid motion-only affordances; pair with color/label changes.

## 8. Accessibility checklist

- Dialogs: `role="dialog"`, `aria-modal`, visible Close, Escape handling.
- Chart/table toggles: `aria-pressed` on view mode buttons.
- Stepper / gallery: `aria-expanded`, listbox semantics on preset menus where applicable.
- Maintain **contrast** for red-on-white primary buttons (WCAG AA for text on `bg-red-600`).

## 9. Icons

Inline SVGs in `Layout.tsx` for navigation; stroke width 2; `aria-hidden` on decorative icons; interactive controls have `aria-label` or visible text.
