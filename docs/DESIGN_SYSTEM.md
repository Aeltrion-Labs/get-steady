Below is a `DESIGN_SYSTEM.md` you can drop into the repo.

````markdown
# Design System and Style Guide
**Product:** Margin-style local-first daily money habit tracker  
**Platform:** Cross-platform desktop app  
**Audience:** Individuals building a daily money habit, often under stress, often looking for clarity over complexity

---

## 1. Design north star

This product should feel:

- calm
- grounded
- private
- competent
- lightweight
- encouraging without being childish
- trustworthy enough for money data
- fast enough to become a daily ritual

This is not a flashy fintech dashboard.  
It is a personal daily console for money awareness.

### Emotional goal
Users should feel:
- "I can face this."
- "This is simple."
- "I know where I stand."
- "Missing a few days is recoverable."

### Product personality
- Quiet confidence
- Clean utility
- No guilt
- No hype
- No "finance bro" energy
- No casino-gamification energy

---

## 2. Core design principles

### 2.1 Calm before clever
Every screen should reduce cognitive load before adding sophistication.

### 2.2 Today is the anchor
The app should revolve around *today*, not an overwhelming control room.

### 2.3 Recovery matters more than streak purity
Missing days is normal. The interface should help users resume quickly.

### 2.4 Manual should feel intentional, not tedious
Manual entry is part of the value proposition. It must be fast and smooth.

### 2.5 Data should feel owned
The product should visually reinforce that this is local, private, and under user control.

### 2.6 Use emphasis sparingly
Too much color, motion, and decoration will make the app feel noisy and less trustworthy.

---

## 3. Visual identity

## 3.1 Brand direction
The visual language should sit between:
- desktop productivity software
- journaling / habit tracking
- modern financial clarity

Not:
- crypto exchange
- consumer banking app
- neon startup dashboard
- gamified wellness toy

### Keywords
- paper ledger meets modern desktop
- soft edges
- subtle structure
- low visual temperature
- focused surfaces
- restrained contrast with intentional highlights

---

## 4. Color system

## 4.1 Theme concept
Use a **cool-neutral base** with muted slate/stone surfaces and a single trustworthy accent.

Recommended accent direction:
- deep teal
- blue-teal
- muted emerald-teal

This gives a feeling of steadiness and competence without cloning the look of many finance apps.

## 4.2 Semantic intent
Use color primarily to communicate:
- state
- hierarchy
- action
- financial meaning

Not decoration.

### Semantic meanings
- **Neutral**: structure, baseline UI
- **Accent**: active actions, selected states, focus
- **Positive**: income, improvement, healthy movement
- **Warning**: catch-up needed, partial entries
- **Danger**: destructive actions, overdue debt stress states
- **Muted**: secondary information, chrome, disabled details

## 4.3 Recommended light theme palette

### Core neutrals
- `background`: `hsl(210 20% 98%)`
- `foreground`: `hsl(222 22% 14%)`
- `card`: `hsl(0 0% 100%)`
- `card-foreground`: `hsl(222 22% 14%)`
- `muted`: `hsl(210 18% 95%)`
- `muted-foreground`: `hsl(215 12% 42%)`
- `border`: `hsl(214 16% 88%)`
- `input`: `hsl(214 16% 88%)`

### Accent
- `primary`: `hsl(187 52% 32%)`
- `primary-foreground`: `hsl(0 0% 100%)`
- `accent`: `hsl(187 32% 92%)`
- `accent-foreground`: `hsl(187 52% 24%)`

### Semantic states
- `success`: `hsl(152 52% 35%)`
- `success-foreground`: `hsl(0 0% 100%)`
- `warning`: `hsl(37 92% 46%)`
- `warning-foreground`: `hsl(28 35% 15%)`
- `destructive`: `hsl(2 72% 52%)`
- `destructive-foreground`: `hsl(0 0% 100%)`

### Data viz
Use a restrained chart palette:
- income: `hsl(152 52% 35%)`
- spending: `hsl(212 56% 45%)`
- debt payment: `hsl(187 52% 32%)`
- debt outstanding: `hsl(12 74% 58%)`
- previous period / comparison: `hsl(215 14% 62%)`
- muted series: `hsl(214 12% 74%)`

## 4.4 Recommended dark theme palette

### Core neutrals
- `background`: `hsl(222 22% 10%)`
- `foreground`: `hsl(210 16% 93%)`
- `card`: `hsl(222 18% 13%)`
- `card-foreground`: `hsl(210 16% 93%)`
- `muted`: `hsl(222 16% 18%)`
- `muted-foreground`: `hsl(216 12% 68%)`
- `border`: `hsl(217 14% 24%)`
- `input`: `hsl(217 14% 24%)`

### Accent
- `primary`: `hsl(187 48% 50%)`
- `primary-foreground`: `hsl(222 22% 10%)`
- `accent`: `hsl(187 24% 20%)`
- `accent-foreground`: `hsl(187 72% 84%)`

### Semantic states
- `success`: `hsl(152 50% 46%)`
- `success-foreground`: `hsl(0 0% 100%)`
- `warning`: `hsl(41 92% 56%)`
- `warning-foreground`: `hsl(28 40% 12%)`
- `destructive`: `hsl(4 78% 61%)`
- `destructive-foreground`: `hsl(0 0% 100%)`

## 4.5 Usage rules
- Primary accent should appear in no more than 10 to 15% of any major screen.
- Positive green should not dominate entire dashboards.
- Avoid red for general spending. Reserve red for destructive or exceptional states.
- Spending should usually be blue-toned or neutral-toned, not danger-toned.

---

## 5. Typography

## 5.1 Goals
Typography should feel:
- legible
- unhurried
- desktop-native
- excellent for tabular numbers

## 5.2 Font recommendations
### UI sans
Use one of:
- **Inter**
- **Geist**
- **IBM Plex Sans**

### Number / tabular support
Use tabular numerals for all monetary values.

### Optional mono for technical surfaces
Use:
- **IBM Plex Mono**
- **JetBrains Mono**

Only for:
- file paths
- export details
- CLI/API/MCP settings
- internal IDs if ever shown

## 5.3 Type scale
Use a compact, desktop-friendly scale.

- `text-xs`: metadata, helper text
- `text-sm`: default body and tables
- `text-base`: forms, primary body
- `text-lg`: section leads
- `text-xl`: card totals
- `text-2xl`: page hero figures
- `text-3xl`: rare, only for major monthly summary moments

## 5.4 Font weight
- 400 regular for body
- 500 medium for labels and controls
- 600 semibold for section titles and important totals
- 700 bold sparingly

## 5.5 Numeric formatting
All currency figures should:
- use tabular numbers
- use consistent decimal precision rules
- right-align in tables
- left-align in cards only when the layout needs warmth over scanability

---

## 6. Spacing, radii, shadow, density

## 6.1 Spacing system
Use a 4px base scale.

Recommended spacing tokens:
- 4
- 8
- 12
- 16
- 20
- 24
- 32
- 40
- 48

## 6.2 Radius
Use moderate rounding. Not bubble UI.

- `sm`: 8px
- `md`: 12px
- `lg`: 16px
- `xl`: 20px

Recommended defaults:
- inputs: 10 to 12px
- cards: 16px
- dialogs: 20px
- pills/badges: full or 999px

## 6.3 Shadows
Use soft, low-contrast shadows.
Prefer border + subtle elevation over heavy glow.

### Suggested shadows
- `shadow-sm`: small control elevation
- `shadow-md`: cards
- `shadow-lg`: dialogs, floating quick add

No neon glows. No giant layered shadows.

## 6.4 Density
Default density should be **comfortable compact**:
- tighter than consumer mobile apps
- more relaxed than enterprise admin tools

---

## 7. Layout system

## 7.1 App shell
Recommended shell:
- left sidebar navigation
- top utility bar
- main content column
- optional right-side contextual panel later

### Sidebar sections
- Today
- Ledger
- Debts
- Trends
- Settings

### Top bar
- page title
- date context
- quick add button
- theme toggle
- optional search later

## 7.2 Screen rhythm
Every major screen should follow this pattern:
1. header
2. summary strip
3. primary work area
4. secondary details

## 7.3 Maximum content width
For dense desktop views:
- default content max width: `1280px`
- summary views may stretch wider if charts/tables benefit

## 7.4 Card usage
Use cards for:
- summary totals
- focused actions
- grouped forms
- catch-up prompts
- debt account modules

Do not turn the entire app into card soup.

---

## 8. Iconography

Use **Lucide** for icons. Lucide provides lightweight, customizable, tree-shakeable SVG icons and has a React package, which fits well with a Tauri + React stack. :contentReference[oaicite:0]{index=0}

### Icon style rules
- default size: 16 or 18
- section icons: 18 or 20
- stroke width consistent
- avoid decorative icons with no semantic value

### Suggested icon mapping
- Today: `CalendarCheck`
- Ledger: `NotebookPen` or `Receipt`
- Debts: `WalletCards` or `CreditCard`
- Trends: `ChartColumn`
- Settings: `Settings`
- Export: `Download`
- Local data: `HardDrive`
- Catch-up: `RotateCcw`
- Income: `ArrowDownLeft`
- Expense: `ArrowUpRight`
- Quick add: `Plus`

---

## 9. Motion and interaction

## 9.1 Motion principles
Motion should:
- clarify
- reassure
- confirm

Not:
- entertain
- celebrate excessively
- distract

## 9.2 Timing
- micro transitions: 120 to 180ms
- panels/dialogs: 180 to 240ms
- reduce motion if OS preference indicates it

## 9.3 Where to animate
Good:
- sidebar item active state
- dialog open/close
- subtle number transition on summaries
- catch-up completion state
- toast entry/exit

Avoid:
- bouncing totals
- slot-machine counters
- over-animated charts
- confetti

---

## 10. Accessibility rules

The component stack should prioritize accessibility from the start. Radix Primitives are explicitly positioned as open-source, accessible building blocks for design systems, and their component docs document keyboard behavior and ARIA patterns for controls such as Tabs, Select, and Navigation Menu. :contentReference[oaicite:1]{index=1}

### Requirements
- keyboard navigable everywhere
- visible focus rings
- semantic labels on all inputs
- not color-dependent for meaning
- chart summaries available as text
- adequate hit areas
- WCAG-friendly contrast targets
- empty states that still orient the user

### Focus style
Use a consistent focus ring:
- 2px ring
- primary accent
- 2px offset on light surfaces
- 1px border reinforcement on dark surfaces

---

## 11. Open source component stack

## 11.1 Foundation
### Tailwind CSS
Use Tailwind as the primary styling system. Tailwind describes itself as a utility-first CSS framework, with styling built by composing utility classes directly in markup. :contentReference[oaicite:2]{index=2}

### shadcn/ui
Use shadcn/ui as the base component system. shadcn/ui describes itself as open source, open code, and not a traditional component library, but a system for building your own component library. That matches the product goal of a distinct, owned design system instead of a rented visual skin. :contentReference[oaicite:3]{index=3}

### Radix Primitives
Use Radix primitives under the hood where needed for accessibility-critical interactions. Radix positions its primitives as unstyled, accessible, open-source building blocks for design systems. :contentReference[oaicite:4]{index=4}

## 11.2 Recommended components by use

### Navigation and shell
Use:
- `Sidebar` patterns from shadcn/ui blocks
- Radix `NavigationMenu` where richer navigation is needed later

shadcn/ui provides open-source blocks and components that can be copied into your app, including dashboard-style layouts. :contentReference[oaicite:5]{index=5}

### Inputs and forms
Use:
- shadcn `Input`
- `Textarea`
- `Select`
- `Combobox`
- `Dialog`
- `Sheet`
- `Popover`
- `Calendar`
- `Form`

For forms, React Hook Form is a good fit because its docs emphasize an uncontrolled/native-input approach and minimizing re-renders. :contentReference[oaicite:6]{index=6}

### Tables
Use **TanStack Table** for the Ledger screen. TanStack Table is headless by design, which gives you full control over markup and styling while handling table logic such as filtering, sorting, pagination, and large data sets. :contentReference[oaicite:7]{index=7}

### Charts
Use **Recharts**, ideally through shadcn's chart patterns. Recharts positions itself as a composable React charting library, and shadcn's chart component is built on Recharts. :contentReference[oaicite:8]{index=8}

### Toasts / transient feedback
Use shadcn toast patterns or a minimal open-source toast layer. Keep toast behavior quiet and infrequent.

### Command / quick add
Use a command palette style sheet/dialog for quick add and navigation.

---

## 12. Component style guide

## 12.1 Buttons
### Variants
- `primary`
- `secondary`
- `ghost`
- `outline`
- `destructive`
- `link`

### Rules
- Primary is reserved for the main action in a region.
- Never place more than one filled primary button in a small action group.
- Use ghost buttons in table toolbars and row actions.

## 12.2 Inputs
- 40 to 44px height default
- clear labels above inputs
- helper text optional
- invalid state uses border + helper text, not color alone

## 12.3 Selects and comboboxes
- same visual height as inputs
- use for categories, debt accounts, date ranges
- support keyboard-first selection

## 12.4 Cards
Cards should feel like quiet trays for information.

Default card anatomy:
- header
- primary content
- optional footer / action row

### Card variants
- summary card
- debt card
- prompt card
- trend card
- empty state card

## 12.5 Tables
The ledger table should:
- prioritize scanability
- keep row height compact
- right-align money columns
- allow subtle zebra striping or hover only, not both heavily
- use muted separators

Recommended columns:
- date
- type
- category
- note
- amount
- debt/account if applicable
- actions

## 12.6 Tabs
Use tabs sparingly.
Best use:
- Today: `Overview | Catch-up`
- Trends: `Month | 3 Months | Year`
- Debts: `All Debts | Payments`

## 12.7 Badges
Use badges for:
- partial check-in
- estimated entry
- category pill
- debt status
- export status

Keep them muted. They are metadata, not trophies.

## 12.8 Empty states
Every empty state should include:
- what this screen is for
- what to do next
- one primary action

Example:
- "No entries yet"
- "Start by logging today's first expense or income entry."
- `Add entry`

---

## 13. Product-specific patterns

## 13.1 Today screen
This is the heart of the app.

### Layout
- header with date and check-in state
- summary row
- quick entry card
- catch-up card if needed
- latest entries list

### Priority order
1. Can I log today quickly?
2. Do I know where I stand today and this month?
3. If I fell behind, can I recover?

## 13.2 Catch-up pattern
Catch-up should never feel punitive.

### Visual treatment
- warning-toned, not destructive-toned
- gentle copy
- clear next action
- list of missed dates
- optional "mark partial"

## 13.3 Debt cards
Each debt card should include:
- debt name
- current balance
- optional lender
- minimum payment
- recent payment
- quick "record payment" action

### Visual rule
Use progress visuals carefully. Debt progress should feel encouraging, not like a shame meter.

## 13.4 Trends
Trends should answer:
- where money went
- whether this month is better or worse than last month
- whether debt is moving in the right direction

Do not overload with 10-chart dashboards.

---

## 14. Writing and microcopy style

## 14.1 Tone
- practical
- calm
- non-judgmental
- direct
- adult
- encouraging without hype

## 14.2 Good copy examples
- "Check in for today"
- "You have 3 missed days to review"
- "Mark today as complete"
- "Add what came in"
- "Add what went out"
- "You can come back and fill in details later"

## 14.3 Avoid
- "Crush your finances"
- "Win the money game"
- "You're behind"
- "Oops!"
- "Congrats superstar!"
- "Freedom score" or clone-adjacent phrasing

---

## 15. Theme recommendation

## 15.1 Theme name
**Harbor Ledger**

Why:
- grounded
- calm
- coastal / safe-port energy
- stable without sounding generic
- fits local-first, owned-data positioning

## 15.2 Theme summary
Harbor Ledger is a restrained desktop theme with cool neutral surfaces, teal-forward accents, soft card radii, clear tabular typography, and minimal motion. It is designed to support daily use without visual fatigue.

## 15.3 Alternate themes for later
- **Paper Ledger**: warmer neutral theme, more notebook-like
- **Night Shift**: dark-first theme with stronger contrast
- **Studio Mono**: power-user theme with tighter density and more mono accents

---

## 16. Suggested CSS variable contract

```css
:root {
  --background: 210 20% 98%;
  --foreground: 222 22% 14%;

  --card: 0 0% 100%;
  --card-foreground: 222 22% 14%;

  --popover: 0 0% 100%;
  --popover-foreground: 222 22% 14%;

  --primary: 187 52% 32%;
  --primary-foreground: 0 0% 100%;

  --secondary: 210 18% 95%;
  --secondary-foreground: 222 22% 20%;

  --muted: 210 18% 95%;
  --muted-foreground: 215 12% 42%;

  --accent: 187 32% 92%;
  --accent-foreground: 187 52% 24%;

  --destructive: 2 72% 52%;
  --destructive-foreground: 0 0% 100%;

  --success: 152 52% 35%;
  --success-foreground: 0 0% 100%;

  --warning: 37 92% 46%;
  --warning-foreground: 28 35% 15%;

  --border: 214 16% 88%;
  --input: 214 16% 88%;
  --ring: 187 52% 32%;

  --radius: 1rem;

  --chart-income: 152 52% 35%;
  --chart-spending: 212 56% 45%;
  --chart-debt-payment: 187 52% 32%;
  --chart-debt-outstanding: 12 74% 58%;
  --chart-comparison: 215 14% 62%;
}
````

---

## 17. Recommended component inventory for v1

Use these first:

### App shell

* sidebar
* separator
* scroll area
* tooltip
* dropdown menu

### Data entry

* button
* input
* textarea
* select
* dialog
* popover
* calendar
* form

### Data display

* card
* table
* tabs
* badge
* chart
* skeleton
* empty state pattern

### Feedback

* toast
* alert
* alert dialog

### Productivity

* command palette
* sheet
* context menu

---

## 18. Guardrails for implementation

### Do

* customize shadcn/ui heavily enough that the app feels owned
* use semantic tokens instead of hard-coded colors in components
* keep numeric hierarchy strong
* make the Today screen extremely polished first

### Do not

* import five different UI systems
* mix radically different icon styles
* use color as the only carrier of meaning
* let charts dominate the app
* overuse gradients
* use celebratory gamification visuals in v1

---

## 19. Recommended open source references

* **shadcn/ui** for the base component model and copy-paste ownership approach. ([Shadcn UI][1])
* **Radix Primitives** for accessible low-level interaction building blocks. ([Radix UI][2])
* **Tailwind CSS** for utility-first styling and design token implementation. ([Tailwind CSS][3])
* **Lucide** for icons. ([Lucide][4])
* **TanStack Table** for Ledger and dense tabular views. ([TanStack][5])
* **Recharts** for charts, ideally via shadcn chart patterns. ([Recharts][6])
* **React Hook Form** for performant forms with native-input leaning ergonomics. ([React Hook Form][7])

---

```

My recommendation is to use **shadcn/ui + Radix + Tailwind + Lucide + TanStack Table + Recharts** as the full visual spine. That stack gives you ownership, accessibility, and enough flexibility to make the app feel like *your* product instead of off-the-shelf furniture. :contentReference[oaicite:16]{index=16}

```

[1]: https://ui.shadcn.com/docs?utm_source=chatgpt.com "Introduction - Shadcn UI"
[2]: https://www.radix-ui.com/primitives?utm_source=chatgpt.com "Radix Primitives"
[3]: https://tailwindcss.com/?utm_source=chatgpt.com "Tailwind CSS - Rapidly build modern websites without ever ..."
[4]: https://lucide.dev/?utm_source=chatgpt.com "Lucide Icons"
[5]: https://tanstack.com/table/latest/docs/introduction?utm_source=chatgpt.com "Introduction | TanStack Table Docs"
[6]: https://recharts.org/?utm_source=chatgpt.com "Recharts"
[7]: https://react-hook-form.com/?utm_source=chatgpt.com "React Hook Form - performant, flexible and extensible form ..."
