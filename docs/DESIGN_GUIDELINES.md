# Design guidelines

Enterprise-ready visual and interaction standards for the **Country Analytics Platform**. Align new UI with **`frontend/tailwind.config.js`**, **`frontend/src/index.css`**, and shared layout components.

---

## 1. Design principles

| Principle | Application |
|-------------|-------------|
| **Clarity over decoration** | White cards, subtle borders, readable chart defaults; avoid ornamental chrome. |
| **Consistent wayfinding** | Primary navigation uses pill `NavLink` controls; active state is visually distinct (`bg-red-600`, white label). |
| **Trust and density** | Analyst users accept information-rich screens; use hierarchy (section labels, accordions, KPI strips). |
| **Accessible defaults** | Focusable controls, dialog semantics, no motion-only affordances. |
| **Theme consistency** | App shell uses slate neutrals + red accent; **PESTEL** and **Porter** use dedicated palettes defined in code—do not mix hex values arbitrarily. |

---

## 2. Color system — application shell (light theme)

The product ships as **light mode first**; there is no separate dark theme token set in the repository today. If dark mode is added later, define parallel semantic tokens and update this document.

### 2.1 Semantic roles (Tailwind slate + red)

| Role | Typical classes | Usage |
|------|-----------------|--------|
| **Page canvas** | `bg-slate-100` | Main background behind cards |
| **Surface** | `bg-white`, `border-slate-200`, `rounded-2xl`, `shadow-sm` | Cards, modals (see `.glass` in `index.css`) |
| **Primary text** | `text-slate-900` | Headings, body emphasis |
| **Secondary text** | `text-slate-600`, `text-slate-500` | Descriptions, hints |
| **Muted / kicker** | `text-slate-400`, uppercase tracking | Section labels |
| **Primary CTA / active nav** | `bg-red-600`, `text-white`, `hover:bg-red-700` | Selected route, primary actions |
| **Secondary control** | `border-slate-200`, `bg-white`, `hover:bg-slate-50` | Neutral buttons |
| **Highlight / warning strip** | `border-red-200`, `bg-red-50` | Secondary emphasis, stepper affordances |

**Contrast:** Body text on white must meet **WCAG AA**; primary buttons must keep sufficient contrast for white label text on `bg-red-600`.

### 2.2 Extended palette (`tailwind.config.js`)

| Token | Scale | Example hex | Suggested use |
|-------|-------|-------------|----------------|
| **ink** | 950 → 700 | `#0c1222` … `#243056` | Deep headings, rare hero contrast |
| **sea** | 500 → 700 | `#2dd4bf` … `#0d9488` | Secondary accents; some education chart series |
| **coral** | 500 → 600 | `#fb7185` … `#f43f5e` | Warm accent alternative to red |

Charts often use **inline hex** strokes from Recharts configuration per page—when adding series, pick **distinct hues** and verify legibility on `bg-white` and fullscreen overlays.

---

## 3. Typography

| Use | Font stack | Source |
|-----|------------|--------|
| **Display / product title** | **Outfit** (`font-display`) | `tailwind.config.js` → `fontFamily.display` |
| **Body** | **Inter**, **DM Sans**, system-ui | `fontFamily.sans` |

**Scale:** `text-xs` meta, `text-sm`–`text-base` body, `text-lg`+ in-card titles. Fullscreen charts use `.cap-viz-fullscreen` rules in `index.css` to bump tick and legend font sizes.

---

## 4. Feature themes

### 4.1 PESTEL dimensions (`frontend/src/components/pestel/pestelTheme.ts`)

| Dimension | Header (hex) | Content tint (hex) |
|-----------|--------------|--------------------|
| POLITICAL | `#1e3a5f` | `#e8eef5` |
| ECONOMIC | `#2d5a4c` | `#e9f2ef` |
| SOCIOCULTURAL | `#9a7340` | `#f4efe6` |
| TECHNOLOGICAL | `#b8573a` | `#f7ece8` |
| ENVIRONMENTAL | `#6b2d38` | `#f0e8ea` |
| LEGAL | `#4a4568` | `#ebeaf2` |

### 4.2 PESTEL SWOT (`SWOT_STYLES` in same file)

| Quadrant | Header (hex) | Tint (hex) |
|----------|----------------|------------|
| Strengths | `#2D5A4C` | `#E9F2EF` |
| Weaknesses | `#A04A26` | `#F7EEEA` |
| Opportunities | `#1D6391` | `#E8F1F6` |
| Threats | `#B01E43` | `#F6E8EB` |

Use **white** (`#ffffff`) or near-white for text on headers; maintain minimum contrast for accessibility.

### 4.3 Porter five forces (`frontend/src/components/porter/porterTheme.ts`)

| Accent key | Hex | Force |
|------------|-----|--------|
| `threat_new_entry` | `#dc2626` | Threat of new entry |
| `supplier_power` | `#2563eb` | Supplier power |
| `buyer_power` | `#2563eb` | Buyer power |
| `threat_substitutes` | `#0ea5e9` | Threat of substitutes |
| `rivalry` | `#64748b` | Competitive rivalry |

### 4.4 Analytics Assistant (`/assistant`)

| Element | Typical tokens / classes | Notes |
|---------|--------------------------|--------|
| **Page canvas** | Same as shell: `bg-slate-100` outer, **white** chat card `border-slate-200` | Keeps Assistant inside the app family |
| **User bubbles** | `bg-red-50`, `text-slate-800` | Aligns with **primary CTA red** for “you spoke” affordance |
| **Assistant avatar** | `bg-teal-100`, `text-teal-600` | Distinct from nav red; signals “system / analyst” reply |
| **Persona banner** | `from-slate-50/90 to-teal-50/30`, **category chip** `bg-teal-700/90 text-white` | Source-category label must stay high-contrast on teal |
| **Primary actions in Steps** | Teal-bordered buttons for **high-impact** workflow (`border-teal-200`, `text-teal-900`, `hover:bg-teal-50`) | Neutral actions stay `border-slate-200` |
| **Web citation links** | `text-teal-700` for titles; `text-blue-600` for inline `[W#]` and markdown links | Matches `MessageContent` split between platform (teal) and external (blue) |
| **Tables in replies** | `border-slate-200`, `bg-slate-50` header row — same as dashboard GFM tables | Full-width scroll `overflow-x-auto` on small viewports |
| **Starter accordions** | White cards, `hover:border-slate-300`, chevron rotation | Empty-state density matches dashboard cards |

Do **not** introduce a third accent family on this page; reserve **red** for user/send, **teal** for assistant chrome and platform-trust cues.

---

## 5. Component patterns

| Pattern | Implementation hints |
|---------|----------------------|
| **Card** | `rounded-2xl border border-slate-200 bg-white p-4 shadow-sm` or `.glass` |
| **Accordion** | Dashboard `AccordionSection` — title row + optional CSV hook |
| **Tables** | Sortable headers where used; fullscreen: `.cap-viz-fs-table` or `.cap-fs-table-shell` |
| **Charts** | `ResponsiveContainer` + shared tooltip shell patterns; lock aspect in fullscreen flex hosts |
| **Fullscreen viz** | `ChartTableToggle` fixed overlay; `cap-viz-fullscreen` on modal root |
| **Group gallery** | `VisualizationStepper` + `VizGalleryContext`; `.cap-viz-gallery-step` for WLD height behavior |
| **Toasts** | Bottom-right; `.toast-slide-in` animation |
| **API debug** | Bottom-left chip expanding to transport log |
| **Assistant chat** | `Assistant.tsx` — composer `CountrySelect`, Prompts popover, Steps `details` panel, `AssistantPersonaBanner`, `MessageContent` |

---

## 6. Spacing and layout

- **Horizontal padding:** `px-3 sm:px-4 lg:px-6 xl:px-8` on main content (`Layout.tsx`).
- **Vertical rhythm:** `space-y-4`–`space-y-8` between major blocks.
- **Header:** `sticky top-0 z-30` with `backdrop-blur` for readability over scroll.

---

## 7. Motion

- Transitions: short defaults (`transition`, standard duration); avoid long easing on large surfaces.
- Toasts: `@keyframes cap-toast-in` in `index.css`.
- Do not rely on animation alone for state changes—pair with color and labels.

---

## 8. Accessibility checklist

- **Dialogs:** `role="dialog"`, `aria-modal="true"`, labelled close control, **Escape** closes.
- **Toggle groups:** `aria-pressed` on chart/table mode buttons where implemented.
- **Navigation:** Visible focus rings on keyboard tab order.
- **Icons:** Decorative SVGs `aria-hidden`; interactive icons have `aria-label` or visible text.
- **Charts:** Provide tabular alternate via chart/table toggle where available.

---

## 9. Icons

Inline SVGs in `Layout.tsx` for navigation; stroke width **2**; consistent size with text alignment.

---

## 10. Content and data visualization

- **Axis labels:** Prefer `shortLabel` from `GET /api/metrics` for compact charts.
- **Footnotes:** Use short, factual notes for year lag, interpolation, or WLD proxy—link or align with **GUARDRAILS.md** wording.
- **Maps:** When `dataYear ≠ requestedYear`, surface both values in UI copy or legend.

---

*Update this file when adding themes, new shared components, or a formal design token pipeline.*
