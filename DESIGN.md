# RoadIQ Design System

RoadIQ uses an editorial, image-first interface inspired by the visual principles in the supplied HorizonX reference: restrained monochrome surfaces, compact pill controls, generous whitespace, soft hairline borders, and confident oversized type. The product remains distinctly RoadIQ and preserves its challenge-first interaction model.

## Foundations

- **Canvas:** warm off-white `#FBFBFA`; dark appearance `#111110`.
- **Ink:** near-black `#171717`; reversed ink `#F5F5F2`.
- **Surfaces:** `#F3F3F1` for grouped content and `#EEEDEA` for secondary emphasis.
- **Semantic color:** green is reserved for success, red for errors or destructive actions. Core navigation and calls to action stay monochrome.
- **Borders:** 11% foreground hairlines. Separation comes from whitespace and tone before shadow.
- **Radii:** 14–22px on cards, fully rounded pills for compact actions and filters.

## Typography

Geist is the single UI family. Display headlines use `clamp()` with tight negative tracking and 0.94–1.02 line height. Body copy remains at 15–18px with relaxed leading. Small labels are 10–11px, semibold, uppercase, and letter-spaced.

## Layout

- Desktop uses a centered 1440px shell and a 72px sticky top navigation.
- Gameplay becomes a balanced image/question split at large widths and a single column on mobile.
- Mobile retains a floating four-tab navigation with 48px minimum targets and safe-area padding.
- Content pages use generous heading space followed by bounded surface cards.

## Interaction

- Primary actions are black/white pills with clear focus rings and restrained press scaling.
- The onboarding question deck is an interactive selector: desktop cards retain the layered fan, mobile cards use horizontal scroll snapping, and a shared readable panel previews the selected real challenge.
- Selecting `Try this question` starts with the active preview instead of discarding the user’s choice.
- Answer options are full-row targets with both border and fill state changes.
- Result states combine icons, text, and semantic color so meaning never relies on color alone.
- Motion is short and functional; all animations collapse under `prefers-reduced-motion`.

## Accessibility

Body text and controls target WCAG AA contrast, touch targets are at least 44px, keyboard shortcuts remain available, semantic headings and landmarks are preserved, and layouts reflow rather than truncate at narrow widths.
