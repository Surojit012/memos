# MemoryOS Design System

This document outlines the visual and structural foundations of the MemoryOS platform, following the **Earthy Dark Mode Hybrid** aesthetic.

## 1. Color Palette

The palette is designed to be warm, organic, and premium, moving away from high-contrast neon to a more sophisticated, muted library of tones.

| Name | Hex | CSS Variable | Usage |
| :--- | :--- | :--- | :--- |
| **Warm Dark** | `#0F1210` | `--bg` | Primary background for all pages. |
| **Muted Surface** | `#1A1F1C` | `--surface` | Background for cards, sections, and secondary layers. |
| **Earthy Teal** | `#5E7D7E` | `--cyan` | Primary brand color, links, buttons, and "Memory" accent. |
| **Sage Green** | `#7A9E8E` | `--green` | Status indicators (live), success states, and secondary accents. |
| **Dusty Rose** | `#A67B73` | `--amber` | Warm accent color for categories, importance markers, and interactive elements. |
| **Muted Smoke** | `#8A9490` | `--text2` | Secondary text, labels, and icons. |
| **Earthy Border** | `#2A302C` | `--border` | Subtle borders for cards and dividers. |

## 2. Typography

We prioritize readability and a "modern mechanical" feel.

- **Headings (Display):** `Manrope`, sans-serif. Used for all H1–H4 titles. Bold or Extra Bold (700-800).
- **Body / Interface:** `Inter`, sans-serif. Used for all UI labels, paragraphs, and lists. Regular (400) or Semi-bold (600).
- **Mono / Technical:** `Inter` (Mono variation). Used for code blocks, hashes, and technical data.

## 3. UI Structure & Components

### Cards & Surfaces
- **Border Radius:** `radius-lg` (16px) for main cards, `radius` (8px) for interactive elements.
- **Glassmorphism:** Use `backdrop-filter: blur(12px)` on top of `rgba(15, 18, 16, 0.9)` for fixed headers.
- **Borders:** Subtle `1px` solid borders using `--border` (`#2A302C`).

### Interactive Elements
- **Selection:** Always use `selection:bg-[#5E7D7E] selection:text-white`.
- **Buttons (Primary):** Earthy Teal background. Hover state: Subtly lightened version with a soft glow.
- **Shadows:** Avoid harsh black shadows. Use soft, layered shadows with slight transparency.

## 4. Special Effects

- **Noise Grain:** A global SVG noise overlay at `0.04` opacity is applied to the background to add organic texture.
- **Scroll Reveal:** Use the `useScrollReveal` hook for subtle fade-in and scale-up entrance animations.
- **Hash Pulse:** For pending on-chain operations, use a subtle opacity oscillation (`0.4` to `0.9`).

---

*Note: This design system is currently implemented via CSS variables in `app/globals.css`. Do not hardcode hex values in component files.*
