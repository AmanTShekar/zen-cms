# Zenith CMS: Structural Skin Engine Developer Guide

> **For React Developers:** This guide explains how to build completely custom structural layouts (Skins) for Zenith CMS, moving beyond CSS variables into completely custom React component trees.

## 1. What is a Structural Skin?

While standard Zenith themes change colors, borders, and CSS effects (Glassmorphic vs Classic), **Structural Skins** actually change the layout of the UI itself. 

For example:
- **Sidebar (Default):** A classic SaaS dashboard with a vertical left-hand navigation menu.
- **TopNav:** A wide-screen layout with a horizontal navigation header.
- **Minimalist Dock (Custom):** A floating macOS-style dock at the bottom of the screen.

## 2. How the Engine Works

The structural skin engine is driven by the `layoutVariant` property on the `ThemePreset` JSON object.

When a user selects a theme from the Theme Store, the `BrandContext` reads the `layoutVariant`. 
The `DashboardLayout.tsx` wrapper component then uses a conditional render block to completely swap out the React structure.

```typescript
// Example from DashboardLayout.tsx
const isTopNav = preset.layoutVariant === 'topnav';

if (isTopNav) {
  return <TopNavLayout children={children} />;
}

// Default fallback
return <SidebarLayout children={children} />;
```

## 3. How to Build a New Custom Skin

If you want to create a completely new frontend design (like a floating dock), follow these steps:

### Step 1: Register the Variant Name
Add your new variant name to the `ThemePreset` interface in `packages/admin/src/context/BrandContext.tsx` and in `docs/THEME_SPEC.md`.

```typescript
interface ThemePreset {
  // ...
  layoutVariant?: 'sidebar' | 'topnav' | 'floating-dock'
}
```

### Step 2: Build the React Layout Wrapper
Open `packages/admin/src/layouts/DashboardLayout.tsx`. 
Right before the `return` statement, add a new layout conditionally rendered based on your variant.

```tsx
const isFloatingDock = preset.layoutVariant === 'floating-dock' && !isMobile;

if (isFloatingDock) {
  return (
    <div className="flex flex-col h-full w-full font-sans" style={{ background: 'var(--z-bg-base)', color: 'var(--z-text-primary)' }}>
      {/* 1. Main Content Area */}
      <main className="flex-1 overflow-auto relative">
        {children || <Outlet />}
      </main>
      
      {/* 2. Your Custom Floating Dock */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-full px-6 py-3 flex gap-4 shadow-2xl" 
           style={{ background: preset.sidebarBg, backdropFilter: 'blur(20px)' }}>
        {navItems.map(item => (
          <Link to={item.path} className="p-2 hover:bg-white/10 rounded-full">
            <item.icon size={20} />
          </Link>
        ))}
      </div>
    </div>
  )
}
```

### Step 3: Update the Theme Store Wizard
So users can easily select your new layout when creating a theme, add a selector button for it in the Custom Theme Wizard located in `packages/admin/src/pages/settings/SettingsThemeStore.tsx`.

### Step 4: Create the CSS Variables
Ensure your layout respects the global `--z-*` CSS variables (see `THEMING_AGENT.md`) so it automatically responds to the user's primary accent colors, backgrounds, and active state glows!

---

By adhering to this engine, Zenith CMS remains 100% headless and modular, allowing infinite frontend possibilities without breaking plugin compatibility.
