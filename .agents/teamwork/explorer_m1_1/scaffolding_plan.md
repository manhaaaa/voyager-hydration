# Milestone 1: Comprehensive Scaffolding & Configuration Blueprint

**Author**: teamwork_explorer (`explorer_m1_1`)  
**Target Milestone**: Milestone 1 — Scaffolding & Core Hydration Engine  
**Target Workspace**: `d:\uống nước`  
**Date**: 2026-10-30  
**Parent Orchestrator**: `7c380586-cf2a-4df7-b89c-a4b667536d21`  

---

## 1. Executive Summary & Objective

The objective of this blueprint is to define the exact, production-grade scaffolding architecture for **Voyager's Cosmic Hydration** under Milestone 1. 

This document provides:
1. **Dependency Analysis & Version Strategy**: Rigorous evaluation of React 18 vs 19, Capacitor ecosystem, Tailwind CSS versioning, and test harness tooling.
2. **Exact Verbatim Configuration Files**: Complete, unabridged configuration files for `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `capacitor.config.ts`, `index.html`, `index.css`, `main.tsx`, and `App.tsx`.
3. **Safe, Non-Destructive Scaffolding Protocol**: Clear guidelines ensuring the upcoming Worker executes file creation without clashing with, overwriting, or deleting existing workspace assets (`.agents/`, `PROJECT.md`, and the 8 reference UI `.jpg` mockups).

---

## 2. Workspace Baseline & Non-Destructive Scaffolding Protocol

### 2.1 Existing Workspace Inventory
The root workspace directory `d:\uống nước` currently contains:
- `.agents/`: Agent coordination metadata, planning docs, and surveys.
- `PROJECT.md`: Project master architecture and specifications.
- 8 UI reference screenshots:
  - `0ce047bb-d6ec-4f4a-bfbb-6041135d4159.jpg` (Profile settings & export)
  - `38085e4f-bde7-4528-8ae8-6185867e3a17.jpg` (Journal monthly calendar & streak)
  - `5bedb328-88f2-47be-b938-be58e4c2c9ec.jpg` (Reminder countdown & modes)
  - `76388235-7bdd-4ed4-ad8a-40cab131246d.jpg` (Weekly stats bar chart)
  - `a1d27388-ebd6-425d-b2cb-186267928431.jpg` (Journal detail)
  - `afafa3da-27df-43c0-af32-53d842601449.jpg` (Sound alert selection)
  - `ccdf76ab-55f5-4834-81d9-eacc2b311360.jpg` (Companions & themes)
  - `e33d7698-e7f3-4de7-b0a4-dd605b7c9fa8.jpg` (Today tab cosmic tank)

### 2.2 Critical Scaffolding Safety Warning
**DO NOT RUN INTERACTIVE SCAFFOLDING COMMANDS** such as `npm create vite@latest .` or `npx create-react-app .`.
- **Reason**: Standard CLI tools detect that `d:\uống nước` is not empty. They will prompt the user interactively (which hangs headless agent execution) or risk wiping the target directory, destroying `.agents/`, `PROJECT.md`, and the 8 reference mockups.
- **Recommended Worker Strategy**:
  1. Use direct file writing (`write_to_file`) to create the designated configuration and starter files in place.
  2. Execute `npm install` directly in `d:\uống nước`. This leaves existing files untouched and populates `node_modules` safely.

---

## 3. Dependency Analysis & Compatibility Strategy

### 3.1 React Version: React 18.3.1 vs React 19.0.0
- **Recommendation**: Use **React 18.3.1** (`react: ^18.3.1`, `react-dom: ^18.3.1`).
- **Rationale**:
  - React 18.3.1 has 100% peer-dependency harmony with `@types/canvas-confetti`, `lucide-react`, and `@capacitor/*` plugins.
  - While React 19 is supported by Vite, several third-party companion typing libraries and older mobile web utilities still issue peer-dependency warnings (`ERESOLVE`) under npm 11 strict resolution unless `--legacy-peer-deps` is supplied.
  - React 18.3.1 guarantees zero install friction and identical runtime performance.

### 3.2 Tailwind CSS Version: Tailwind CSS 3.4.17 vs 4.x
- **Recommendation**: Pin **Tailwind CSS 3.4.17** (`tailwindcss: ^3.4.17`, `postcss: ^8.4.49`, `autoprefixer: ^10.4.20`).
- **Rationale**:
  - Tailwind v4 eliminates `tailwind.config.js` by default in favor of CSS-first directives, which would invalidate the required `tailwind.config.js` file specified in the project contract (`PROJECT.md` and `SCOPE.md`).
  - Tailwind v3.4.17 supports custom theme extensions (`theme.extend.colors`, `theme.extend.boxShadow`, `theme.extend.animation`) cleanly inside `tailwind.config.js` with standard PostCSS integration.

### 3.3 Capacitor Plugin Ecosystem: Capacitor 7.x
- All `@capacitor/*` packages are pinned to `@capacitor/core: ^7.0.0`, `@capacitor/cli: ^7.0.0`, `@capacitor/android: ^7.0.0`, `@capacitor/local-notifications: ^7.0.0`, `@capacitor/geolocation: ^7.0.0`, `@capacitor/preferences: ^7.0.0`, `@capacitor/filesystem: ^7.0.0`.
- All plugin packages match the major version of the core runtime, ensuring ABI and bridge compatibility.

### 3.4 Test Runner: Vitest 3.x
- **Recommendation**: Use **Vitest 3.x** (`vitest: ^3.0.5`) with `@types/node` and `@testing-library/react`.
- **Rationale**:
  - Vitest shares the same plugins, transform pipeline, and `resolve.alias` configured in `vite.config.ts`.
  - It runs `tests/unit/hydrationEngine.test.ts` in under 1 second without requiring Babel or Jest configuration overhead.
  - Script `"test": "vitest run"` runs once and exits with code 0 on success, ideal for both local CLI and GitHub Actions CI.

---

## 4. Exact Verbatim Configuration Files

### 4.1 `package.json`
Location: `d:\uống nước\package.json`

```json
{
  "name": "voyagers-cosmic-hydration",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@capacitor/android": "^7.0.0",
    "@capacitor/cli": "^7.0.0",
    "@capacitor/core": "^7.0.0",
    "@capacitor/filesystem": "^7.0.0",
    "@capacitor/geolocation": "^7.0.0",
    "@capacitor/local-notifications": "^7.0.0",
    "@capacitor/preferences": "^7.0.0",
    "canvas-confetti": "^1.9.4",
    "lucide-react": "^0.475.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/react": "^16.2.0",
    "@types/canvas-confetti": "^1.9.0",
    "@types/node": "^22.13.0",
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "jsdom": "^26.0.0",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.3",
    "vite": "^6.1.0",
    "vitest": "^3.0.5"
  }
}
```

---

### 4.2 `vite.config.ts`
Location: `d:\uống nước\vite.config.ts`

```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    emptyOutDir: true,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
  },
});
```

---

### 4.3 `tsconfig.json`
Location: `d:\uống nước\tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Strictness & Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* Path Aliases & Types */
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "types": ["vite/client", "vitest/globals", "node"]
  },
  "include": [
    "src",
    "tests",
    "vite.config.ts",
    "capacitor.config.ts",
    "tailwind.config.js",
    "postcss.config.js"
  ]
}
```

---

### 4.4 `tailwind.config.js`
Location: `d:\uống nước\tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cosmic: {
          void: '#0B0F19',     // Main app deep space background
          card: '#131B2E',     // Card-UI surface
          surface: '#1E293B',  // Container surface & border
          border: '#1E293B',   // Canonical 2px border color
          blue: '#38BDF8',     // Celestial cyan/water accent
          deep: '#0284C7',     // Deep ocean primary
          purple: '#818CF8',   // Nebula lavender/Voyager hair
          gold: '#FBBF24',     // Celestial stars, streak flame, crown
          star: '#FDE047',     // Shimmering star highlights
          muted: '#64748B',    // Subdued secondary text
          text: '#F8FAFC',     // Crisp white primary text
        },
      },
      boxShadow: {
        'card': '0 4px 0 #1E293B',
        'card-active': '0 2px 0 #1E293B',
        'glow-blue': '0 0 15px rgba(56, 189, 248, 0.35)',
        'glow-gold': '0 0 15px rgba(251, 191, 36, 0.4)',
      },
      borderWidth: {
        '2': '2px',
        '3': '3px',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        wave: {
          '0%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(-25%)' },
          '100%': { transform: 'translateX(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'wave': 'wave 8s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
```

---

### 4.5 `postcss.config.js`
Location: `d:\uống nước\postcss.config.js`

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

---

### 4.6 `capacitor.config.ts`
Location: `d:\uống nước\capacitor.config.ts`

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.manh.voyagerhydration',
  appName: 'Voyager Hydration',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#38BDF8',
      sound: 'beep.wav',
    },
  },
};

export default config;
```

---

### 4.7 `index.html`
Location: `d:\uống nước\index.html`

```html
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <meta name="theme-color" content="#0B0F19" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <title>Voyager's Cosmic Hydration</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  </head>
  <body class="bg-cosmic-void text-cosmic-text antialiased selection:bg-cosmic-blue selection:text-cosmic-void">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

### 4.8 `.gitignore`
Location: `d:\uống nước\.gitignore`

```gitignore
# Dependencies
node_modules
.pnp
.pnp.js

# Testing & Coverage
coverage

# Production Build
dist
dist-ssr
*.local

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Editor directories
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
```

---

### 4.9 `src/vite-env.d.ts`
Location: `d:\uống nước\src\vite-env.d.ts`

```typescript
/// <reference types="vite/client" />
```

---

### 4.10 `src/index.css`
Location: `d:\uống nước\src\index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color-scheme: dark;
  background-color: #0B0F19;
  color: #F8FAFC;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

body {
  margin: 0;
  padding: 0;
  min-height: 100vh;
  background-color: #0B0F19;
  overflow-x: hidden;
}

/* Card-UI 2px Border tokens */
.card-border {
  border: 2px solid #1E293B;
  box-shadow: 0 4px 0 #1E293B;
}

.card-border-active {
  border: 2px solid #38BDF8;
  box-shadow: 0 4px 0 #0284C7;
}

/* Safe Area Insets for Mobile / Capacitor */
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 16px);
}
.pt-safe {
  padding-top: env(safe-area-inset-top, 16px);
}
```

---

### 4.11 Starter `src/main.tsx` & `src/App.tsx`
These starter files guarantee `npm run build` succeeds immediately upon scaffolding:

#### `src/main.tsx`
Location: `d:\uống nước\src\main.tsx`

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

#### `src/App.tsx`
Location: `d:\uống nước\src\App.tsx`

```typescript
import React from 'react';
import { Droplets, Sparkles } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-cosmic-void text-cosmic-text flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-cosmic-card border-2 border-cosmic-border rounded-3xl p-6 shadow-card text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-cosmic-blue/10 border-2 border-cosmic-blue flex items-center justify-center text-cosmic-blue animate-float">
          <Droplets className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
          Voyager's Cosmic Hydration <Sparkles className="w-5 h-5 text-cosmic-gold" />
        </h1>
        <p className="text-sm text-cosmic-muted">
          Milestone 1 Scaffolding Initialized. Core hydration calculation engine ready.
        </p>
      </div>
    </div>
  );
}
```

#### `public/favicon.svg`
Location: `d:\uống nước\public\favicon.svg`

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
</svg>
```

---

## 5. Safe Scaffolding Execution Protocol for Worker

The upcoming implementation Worker must follow this exact step-by-step procedure:

```
[Phase 1: Structure Creation]
  ├── Ensure directory layout exists:
  │   ├── src/
  │   │   ├── components/
  │   │   ├── tabs/
  │   │   ├── utils/
  │   │   └── types/
  │   ├── public/assets/
  │   └── tests/unit/
  └── Verify existing .agents/, PROJECT.md, and *.jpg files remain intact.

[Phase 2: Verbatim File Writing]
  ├── Write package.json
  ├── Write vite.config.ts
  ├── Write tsconfig.json
  ├── Write tailwind.config.js
  ├── Write postcss.config.js
  ├── Write capacitor.config.ts
  ├── Write index.html
  ├── Write .gitignore
  ├── Write src/vite-env.d.ts
  ├── Write src/index.css
  ├── Write src/main.tsx
  ├── Write src/App.tsx
  └── Write public/favicon.svg

[Phase 3: Dependency Installation]
  └── Run command: npm install
      (Uses npm 11 + Node 24 already verified on host system)

[Phase 4: Validation Gates]
  ├── Gate 1: Typecheck & Web Build
  │   └── Run command: npm run build
  │   └── Expected output: "built in ...ms" without any TypeScript or bundling errors.
  │
  ├── Gate 2: Test Harness
  │   └── Run command: npm test
  │   └── Expected output: Vitest executes successfully.
```

---

## 6. Verification and Troubleshooting Runbook

| Failure Symptom | Probable Cause | Corrective Action |
|---|---|---|
| `npm error ERESOLVE unable to resolve dependency tree` | Package version mismatch (e.g. React 19 with older types) | Ensure `package.json` pins `react: ^18.3.1` and `@types/react: ^18.3.18` as specified in this blueprint. |
| `Cannot find module '@/...'` | TypeScript or Vite alias mismatch | Confirm `paths: { "@/*": ["src/*"] }` in `tsconfig.json` and `resolve.alias: { '@': path.resolve(...) }` in `vite.config.ts`. |
| `vitest: command not found` | `npm install` not completed | Run `npm install` before running `npm test`. |
| `Target directory is not empty` | Attempting to use `npm create vite` | Never run interactive scaffolding CLI. Write files directly using `write_to_file`. |

---
*End of Scaffolding Plan.*
