---
applyTo: "pages/**/*.vue,components/**/*.vue,app.vue,composables/**/*.{js,ts},server/api/**/*.{js,ts},nuxt.config.ts"
---

# Vue and Nuxt Instructions

- Generate Vue 3 Single File Components, not React-style JSX.
- Prefer `<script setup>` for Vue components.
- Keep page views in `pages/` and reusable UI in `components/`.
- Put shared state or view logic in `composables/`.
- Use Nuxt utilities such as `navigateTo` and `$fetch` when they fit existing code.
- Keep server routes in `server/api/` and keep filesystem or launchctl logic on the server side.
- Match the existing JavaScript-first style unless there is a clear reason to introduce TypeScript.
- Keep templates simple and move repeated logic into script or composables when needed.
- Preserve existing Japanese labels and messages unless the task requires changing them.
- Avoid adding dependencies or abstractions when the existing code can handle the change directly.