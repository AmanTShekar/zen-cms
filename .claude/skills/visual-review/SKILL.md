---
name: visual-review
description: Manually invoked skill for auditing, reviewing, and reskinning Zenith CMS components to adhere to our high-fidelity glassmorphism design system. Usage: /visual-review
---

# Zenith Visual Excellence Review (visual-review)

This skill enforces Zenith's strict design principles across all UI components, views, and dashboards.

---

## 🎨 1. The Glassmorphic Specification Checklist

Whenever reviewing or building a Zenith CMS dashboard or storefront UI component, ensure it satisfies the following styling rules:

### A. Backdrop Blur & Transparency
*   **Active Overlays**: Container frames must combine `bg-opacity` with strong backdrop blurs:
    ```css
    background-color: rgba(17, 24, 39, 0.65); /* Rich Slate/Black transparency */
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    ```
*   **Borders**: Containers must use subtle, semi-transparent borders to delineate edges without harsh solid lines:
    ```css
    border: 1px solid rgba(255, 255, 255, 0.08);
    ```

### B. High-Fidelity Color Palette (Deep Dark Theme)
*   **Base Canvas Background**: Deep Obsidian (`#0B0F19` or `hsl(222, 47%, 7%)`).
*   **Secondary Containers**: Slate-Dark (`#1F2937` or `hsl(220, 25%, 15%)`).
*   **Accent Glows**: Harmonic Cyber-Purple (`#8B5CF6`) and Teal-Green (`#10B981`) instead of basic primary red/blue/green colors.

### C. Hover and Active Micro-Animations
*   **Transitions**: Ensure all hoverable items have explicit, smooth transitions:
    ```css
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    ```
*   **Interactive Scale**: Small dynamic scale-ups on primary cards:
    ```css
    transform: scale(1.02);
    box-shadow: 0 10px 25px -5px rgba(139, 92, 246, 0.25);
    ```

---

## 🛠️ 2. Step-by-Step Code Review Process

1.  **Code Inspection**: Search for non-standard utility classes (e.g. standard bright colors like `bg-red-500` or solid gray borders like `border-gray-300`).
2.  **Verify Animation Footprints**: Check that Framer Motion elements use `layoutId` where appropriate, are hardware-accelerated (`transform-gpu`), and have explicit transition timelines (avoiding default spring timings that can cause visual jitters).
3.  **Audit Responsiveness**: Ensure flex containers and grid systems wrap properly and adapt seamlessly across mobile, tablet, and desktop bounds.
4.  **No Placeholders**: Never allow static mock images or empty placeholders. Replace any mock layouts with beautifully styled, functional dashboards containing real interactive elements.
