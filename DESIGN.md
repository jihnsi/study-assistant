# Design

<!-- impeccable:design-schema 1 -->

Margin (旁註) is a study tool for Hong Kong undergraduates. The interface should feel like a well-kept exercise book: calm paper, dark ink, and a red pen used only where it means something. Credible to a supervisor, usable on a phone on the MTR.

Register: product (design serves the task). Everything below lives in `app/globals.css`; tokens are on `:root`.

## Concept and motif

The margin of a school exercise book. Students write notes beside the text; Margin does the same with page citations.

**The logo** is a cursive M (Dancing Script SemiBold, converted to a path) on an ink tile: `LogoMark` in `components/Icons.js` and `app/icon.svg`.

**Vermilion** (`--margin`, 2px) is reserved for two marks: the active tab underline and the streaming caret. The decorative vertical margin line was tried and removed (user decision, 29 Oct 2026): no full-height rule on sign-in, no rule beside document rows, no `border-left` stripes.
- Red-pen colour (`--margin-ink`) is for things a teacher would mark: citations, errors, delete. `--margin` itself is decoration and is not used for text.

## Colour (OKLCH, light and dark)

Strategy: restrained. Tinted neutrals, one working accent (pen-blue), one signature (vermilion). Dark theme follows `prefers-color-scheme`.

| Token | Light | Role |
|---|---|---|
| `--paper` | 0.982 0.004 260 | page background |
| `--surface` | white | sheets, rows, inputs |
| `--sunk` | 0.958 0.007 260 | wells, hover fill, skeletons |
| `--line` | 0.90 0.008 260 | hairlines |
| `--line-input` | 0.62 0.02 260 | control borders (3.5:1 on surface) |
| `--ink` | 0.22 0.03 265 | body text (17:1) |
| `--ink-2` | 0.42 0.028 265 | secondary text (8:1) |
| `--ink-3` | 0.50 0.025 265 | hints, meta (5.7:1) |
| `--pen` / `--pen-hover` / `--pen-wash` | 0.46 0.16 262 / 0.38 / 0.95 | primary action, links, focus ring |
| `--margin` | 0.60 0.205 32 | the rule (decoration, 4:1) |
| `--margin-ink` / `--margin-wash` | 0.50 0.19 30 / 0.96 0.022 30 | red-pen text and its wash (6.6:1) |
| `--ok` / `--ok-wash` | 0.45 0.11 155 / 0.96 0.028 155 | success |

Dark values are in the `@media (prefers-color-scheme: dark)` block (paper 0.19, surface 0.235, pen 0.76 with dark `--on-pen`). All text pairs checked at 4.5:1 or better in both themes. Do not hard-code colours in components; use tokens. `color-mix(in oklab, var(--x) N%, transparent)` is fine for borders.

## Type

- Display and headings: Newsreader (variable, optical size) with Noto Serif TC for Chinese. `var(--font-display)`.
- UI and body: Instrument Sans with Noto Sans TC. `var(--font-ui)`.
- CJK fonts load with `preload: false`; Google splits them into unicode-range slices, so only used glyph slices download.
- Scale: `--text-xs` 12, `--text-sm` 14, `--text-base` 16, `--text-lg` 18, `--text-xl` 22, `--text-2xl` 28, `--text-3xl` fluid 32 to 44, `--text-display` fluid 56 to 96 (sign-in wordmark only).
- Chinese rules (set on `html:lang(zh-HK)`): line-height 1.75, letter-spacing 0.02em on body and 0.04em on headings, heading weight 600, `word-break: auto-phrase`, no italics (the English tagline is italic; Chinese is upright).
- Body line length is capped at 65 to 68ch. Headings use `text-wrap: balance`.

## Space, shape, depth, motion

- Space: 4px base. `--sp-1..9` = 4, 8, 12, 16, 24, 32, 48, 64, 96. Page gutter `--gutter` = clamp(16px, 4vw, 48px). Vary rhythm: 48px between page sections, 16px inside them.
- Radius: `--r-1` 4 (chips of text, focus), `--r-2` 8 (buttons, inputs, notices), `--r-3` 12 (sheets, lists, drop zone), `--r-pill` (citation chips, drop icon). Nothing larger.
- Shadow: `--shadow-1` hairline, `--shadow-2` for the sign-in sheet only. Lists and cards use a 1px `--line` border and no shadow. Never both a border and a wide shadow.
- Motion: `--ease-out` (ease-out-quart). Only the sheet settle, upload progress, tab underline. Reduced motion collapses all durations and freezes the indeterminate progress bar.
- Z-index scale: `--z-sticky` 10, `--z-overlay` 100, `--z-toast` 200.
- Layout width: `--page-max` 60rem. Override it on a wrapper for the wide document view.

## Components (class names to reuse)

**Buttons** `.btn` plus `.btn-primary` (pen), `.btn-secondary` (outlined), `.btn-ghost`, `.btn-danger` (solid red pen, only for confirmed destructive actions); modifiers `.btn-sm`, `.btn-block`, `.is-danger` on `.btn-ghost` for red-pen text. 44px minimum height (40 for `-sm` on fine pointers). Icons go inside the button before the label.

**Links** `.link` for inline text buttons that act like links.

**Fields** `.field` wraps `label`, `input`, optional `.hint`, optional `.field-error` (`aria-invalid`, `aria-describedby` wired by the component). Inputs are 48px, 16px text.

**Notices** `.notice` plus `.notice-error | .notice-ok | .notice-info`; icon, `<span>` text, optional trailing `.btn`. Errors use `role="alert"`; success uses `role="status"`.

**List rows** `ul.doc-list > li.doc`: icon tile `.doc-icon`, `.doc-main` (`.doc-name`, `.doc-meta`), `.doc-actions`. `.doc-open` is the name as a button (hover and focus colour the text pen-blue and underline; the whole row is the hit area). Inline destructive confirmation is `.doc-confirm` (red-pen wash, a sentence, `.btn-danger` + `.btn-secondary`; focus lands on Cancel; Escape cancels). Add rows of the same shape rather than new card styles.

**Drop zone** `.drop` (`.is-over` while dragging), `.progress > .progress-fill`, `.privacy` line with lock icon.

**Empty and loading** `.empty` (dashed, title plus one sentence that says what to do), `.skeleton` rows with a visually hidden status.

**Language toggle** `.lang` segmented control (`aria-pressed`), always in the header or the sign-in top row.

**Header** `.bar > .bar-inner` with `.brand` (logo mark and `.brand-name`) and `.bar-tools`. Sticky at 880px and up; static on phones, where it becomes a two-row grid.

### The document view (built)

- **Tabs** (Summary / Ask): `<div class="tabs" role="tablist">` with `<button class="tab" role="tab" aria-selected="true|false">`. The selected tab gets the vermilion underline. Panels are normal blocks with `role="tabpanel"`.
- **Citation chip**: `<button class="cite" type="button">p. 3</button>` (or `<a class="cite">`). Pill, red-pen text on red-pen wash, fills solid on hover; `aria-current="true"` marks the chip whose page is showing. It is inline, so it sits inside paragraphs; its touch target is larger than it looks. In react-markdown, override `a` so `#page-N` hrefs render a `.cite` chip that jumps the viewer.
- **Markdown output**: wrap in `<div class="md">`; add `is-streaming` while text arrives for a blinking margin-red caret. Styles cover `##`/`###`, lists, bold, paragraphs and simple tables (tables scroll inside themselves).
- **Layout suggestion**: two panes (PDF left, study panel right) from about 900px; on phones, a segmented switch between the PDF and the study panel, not a stacked scroll. Keep the header, set `--page-max: none` on the wrapper. Reuse `.notice` for errors (map `no_text`, `rate_limited`, `not_configured`, `model_error` to specific strings in both languages) and `.skeleton` for waiting.

## Copy

Plain, specific, sentence case, active voice. Errors say what happened and what to do, with no apology. Same action, same name everywhere ("Delete" then "Deleted: name"). No emoji. Every string is in `lib/i18n.js` in both `en` and `zh`; Chinese is Traditional, Hong Kong written style, and is written for the Chinese reader, not translated word for word.

## Do not

- Cream or beige backgrounds, purple gradients, glass blur, blobs, hero plus three feature cards.
- Coloured `border-left` stripes, gradient text, border plus wide shadow, radius above 12px on boxes.
- Placeholder UI for features that do not exist yet.


## Document view (as built)

`components/DocumentView.js` (header, study panel with tabs) with `PdfPane`, `SummaryPanel`, `AskPanel`, and `AiMarkdown` (model Markdown with citation chips). CSS is the "Document view" block in `globals.css` (`.dv-*`).

- Opened from the library with `?doc=<fileId>` via `history.pushState` / `popstate` (no `useSearchParams`). The library stays mounted but hidden while a document is open.
- Desktop (900px and up): PDF left, study panel right, each scrolls on its own, `--dv-pad` 24px. Phone: `.seg` switch (Study / PDF) under the header; one pane at a time; citation taps switch to the PDF.
- Study panel: tabs, one trust note (answers only from this PDF, DeepSeek disclosure), then the panel. Both panels stay mounted so a running request survives a tab switch.
- Ask: question as a `--sunk` block aligned right, answer as plain `.md` below, turns separated by a hairline. Composer is sticky at the bottom of the panel.
- Citation chips: `.cite` button, "p. 3" / "第 3 頁". A page past the PDF's page count renders as `.cite-off` (dashed, not clickable).
- Streaming text is not a live region; a visually hidden `role="status"` announces start and finish.

## Preferences view (as built)

`components/Preferences.js`, opened with `?view=prefs` (it can sit on top of a document: `?doc=<id>&view=prefs`; the document stays mounted but hidden, so a running answer survives). `lib/prefs.js` holds the Appwrite read-modify-write helpers and `PrefsProvider` / `usePrefs()`; `lib/prefs-schema.js` holds the shape. CSS is the "Preferences view" block in `globals.css` (`.prefs-*`, `.pref-*`, `.mem*`, `.switch-track`).

- **Entry**: a "Preferences" button (sliders icon + label; icon only under 400px, aria-label always) in the library header, grouped with Sign out in `.bar-actions`. In a document, the Summary and Ask tabs end with a small muted line ("Answers use your preferences · Edit", plus "Memory is off" when it is) that links to the view (`PrefsLink`, a real `<a href>` that navigates in place).
- **Navigation**: same pushState / popstate approach as `?doc=`. Back uses `history.back()` when Preferences was opened inside the app, and replaces the entry when the page was loaded straight on `?view=prefs`. Scroll and focus return to where they were.
- **Layout**: one narrow column (`--page-max: 46rem`), no cards: h2 sections ("How Margin explains", "Memory"), spacing carries the grouping. Segmented choices reuse `.seg` (`.seg-3` for three options) with a one-line description of the selected option.
- **Switch**: `button.pref-switch[role="switch"][aria-checked]`, the whole row is the target, the label is its name. It saves immediately; the pen-blue track is the only colour.
- **Memory list**: `ul.doc-list.mem-list > li.mem` (note text, a small `.mem-source` tag - From a question / From a PDF / Added by you - and the date, ghost "Edit" and red-pen "Forget"). Newest first, with "n / 50" above the list. "+ Add a note" and "Edit" open the same inline `.mem-form` (one `.field` input, max 200 characters, autofocus, Enter saves, Escape cancels, Save and Cancel buttons, empty text refused); focus returns to the opening control. Add is disabled at 50 with a short message. Notes are saved immediately through `addMemory` / `updateMemory` (re-read, change only `margin.memories`). "Forget everything" opens the same inline `.doc-confirm` as deleting a PDF (focus on Cancel, Escape cancels).
- **Unsaved changes**: Back with edits shows an inline `.notice-info` (Leave without saving / Keep editing). No `window.confirm`. Browser Back cannot be intercepted, so it leaves silently.
- **Honesty copy**: the memory note says Margin writes notes from questions and summarised PDFs, the student can edit them or add their own, they are stored in the account, only shape tone and examples (never facts), and can be deleted at any time. The note field warns against private details.
- **Summary cache**: keys include `summaryPrefsKey(prefs)` (level and length), so a summary written before those change is not shown afterwards.
