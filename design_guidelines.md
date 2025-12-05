# ChronoMind Design Guidelines

## Design Approach
**System Selected:** Linear + Notion Hybrid  
**Justification:** ChronoMind is a productivity-focused application requiring clarity, efficiency, and sophisticated data visualization. This approach combines Linear's precision with Notion's content flexibility.

**Core Principles:**
- Information density with breathing room
- Instant visual feedback for AI interactions
- Clear hierarchy between chat and memory systems
- Professional, trustworthy aesthetic for AI/data handling

---

## Layout System

**Spacing Primitives:** Use Tailwind units of `2, 4, 6, 8, 12, 16, 20, 24` for consistent rhythm
- Micro spacing: `p-2, gap-2` (tight elements)
- Standard spacing: `p-4, gap-4, m-6` (component internals)
- Section spacing: `p-8, py-12, gap-8` (major divisions)
- Page margins: `p-16, py-20, py-24` (screen-level)

**Grid Structure:**
- Sidebar navigation: Fixed `w-64` (desktop), collapsible drawer (mobile)
- Main content area: `max-w-4xl` for chat, `max-w-6xl` for memory views
- Settings panels: `max-w-3xl` centered
- Multi-column layouts: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` for memory cards/provider cards

---

## Typography

**Font Selection:** Inter (via Google Fonts CDN) - single family for clean consistency

**Hierarchy:**
- Page titles: `text-3xl font-bold tracking-tight` 
- Section headers: `text-xl font-semibold`
- Card titles: `text-lg font-medium`
- Body text: `text-base font-normal leading-relaxed`
- Metadata/labels: `text-sm font-medium uppercase tracking-wide`
- Timestamps/secondary: `text-xs`
- Code/API keys: `font-mono text-sm`

---

## Component Library

### Navigation
**Sidebar (Desktop):**
- Fixed left panel with icon + label menu items
- Active state: subtle left border accent with background fill
- Sections: Chat, Memory, Providers, Storage, History, Settings
- User profile at bottom with Firebase avatar

**Mobile:**
- Bottom tab bar (5 core actions)
- Hamburger menu for secondary navigation

### Chat Interface
**Layout:**
- Full-height conversation area
- Input fixed at bottom with auto-expand textarea (max 6 lines)
- Messages: Left-aligned user, right-aligned AI
- Message bubbles: `rounded-2xl` with generous `p-4 px-6` padding
- Avatar indicators: Small circular icons (user/AI provider logo)
- Typing indicator: Animated dots pattern

**Message Features:**
- Timestamp on hover: `text-xs opacity-60`
- Copy button per message (icon-only, appears on hover)
- Memory context indicator: Small badge showing "Retrieved 3 memories"
- Provider badge: Subtle chip showing which LLM responded

### Memory Viewer
**Card Grid Layout:**
- Masonry-style cards: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- Each card: `rounded-xl border p-6` with hover lift effect

**Card Types:**
1. **Facts Card:** Key-value pairs in clean list
2. **Summaries Card:** Timeline view with date markers
3. **Embeddings Card:** Visual representation (tag cloud or simple count)
4. **Projects Card:** Status badges + progress indicators

**Search Bar:**
- Prominent top position: `sticky top-0`
- Semantic search input with icon
- Filter chips below: "Facts", "Summaries", "All Time", "Last 30 Days"

### Provider Settings
**API Key Management:**
- Card-based layout for each provider
- Provider logo + name header
- Masked input field: `font-mono` with show/hide toggle (eye icon)
- Connection status indicator: "Connected" badge or "Add Key" button
- Test connection button (secondary style)

**Supported Providers Grid:**
- `grid-cols-2 lg:grid-cols-4` showing all 7 providers
- Each as clickable card with logo, name, status

### Forms & Inputs
**Input Fields:**
- Height: `h-12` for standard, `h-10` for compact
- Rounded: `rounded-lg`
- Padding: `px-4`
- Border state: default/focus/error with appropriate visual feedback
- Labels: `text-sm font-medium mb-2` above input
- Helper text: `text-xs mt-1`

**Buttons:**
- Primary: `h-11 px-6 rounded-lg font-medium`
- Secondary: Same size, different treatment
- Icon buttons: `h-10 w-10 rounded-lg` (settings, actions)
- Danger: Clear destructive treatment for delete/disconnect

### Storage Settings Panel
**Toggle Cards:**
- Three options: Device Storage (disabled for web), Google Drive, Firestore
- Radio-style selection with large clickable cards
- Each card shows: Icon, title, description, status indicator
- Active card: prominent visual distinction
- Drive/Firestore cards show connection status and "Manage Access" button

### Conversation History
**Timeline Layout:**
- Chronological list with date dividers: `text-sm font-semibold py-4`
- Each session: Collapsible card showing first message + metadata
- Expand to see full conversation
- Search/filter bar at top
- Export options (top-right): "Export JSON", "Export TXT"

### Persona Configuration
**Form Layout:**
- Single column `max-w-2xl`
- Sections: Name, Role, Personality Traits, Knowledge Areas
- Textarea for custom instructions: `min-h-32 rounded-lg`
- Tag input for traits/areas: Pills with remove X
- Save/Reset buttons at bottom

---

## Data Visualization
**Memory Insights:**
- Simple bar charts for "Topics Discussed" (Chart.js)
- Timeline view for conversation frequency
- Stats cards: "Total Conversations", "Memory Items", "Active Projects"
- Minimal, clean chart styling - no heavy gradients

---

## Icons
**Library:** Heroicons (via CDN) - outline for general UI, solid for active states
- Navigation: outline icons
- Actions: outline with solid on active
- Status indicators: solid mini icons

---

## Animations
**Minimal & Purposeful:**
- Message send: Smooth slide-up entry
- Memory retrieval: Subtle pulse on context badge during loading
- Page transitions: None (instant navigation)
- Hover states: Simple scale or background shifts
- Loading states: Spinner or skeleton screens (not both)

**Avoid:** Scroll-triggered animations, parallax, excessive motion

---

## Accessibility
- All interactive elements: minimum `h-11` touch target
- Form inputs: Consistent `h-12` height
- Clear focus states with visible outlines
- ARIA labels on icon-only buttons
- Keyboard navigation for all core flows

---

## Images
**No hero images** - This is a functional application, not a marketing site.

**Images Used:**
1. Provider logos (OpenAI, Claude, Gemini, etc.) - 40x40px in settings cards
2. User avatar from Firebase Auth - displayed in sidebar and chat
3. Empty state illustrations - Simple line art for "No conversations yet", "No memories stored"
4. Onboarding graphics (optional) - 3-4 simple diagrams explaining memory concept

All images should be crisp, minimal, and support the professional utility aesthetic.