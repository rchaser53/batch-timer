# Copilot Instructions for This Repository

This repository uses Nuxt 3 with Vue 3 Single File Components.

## Framework and architecture

- Prefer Nuxt 3 and Vue 3 patterns over generic frontend examples.
- Use Vue Single File Components for UI changes.
- Keep page-level UI in `pages/` and reusable UI in `components/`.
- Keep reusable state and view logic in `composables/`.
- Keep server endpoints in `server/api/` using Nuxt server route conventions.
- Do not introduce React, Next.js, or client-side patterns that do not fit Nuxt.

## Vue component conventions

- Prefer `<script setup>` in `.vue` files.
- Use Vue refs and reactive state idiomatically.
- Keep components focused and avoid large inline logic blocks in templates.
- Prefer `defineProps` and `defineEmits` for component contracts.
- Preserve the existing simple Options-free style used in this repository.
- Follow the current styling approach unless the task explicitly requires a design change.

## Nuxt conventions

- Use `navigateTo` and `$fetch` when appropriate for this codebase.
- Prefer Nuxt auto-imported utilities when they are already standard in the project.
- Respect the existing file-based routing structure in `pages/` and `server/api/`.
- Keep server-side filesystem access and launchctl-related logic on the server side.

## JavaScript and TypeScript guidance

- Match the existing language choice in nearby files before introducing TypeScript.
- Keep code small, explicit, and easy to trace.
- Avoid adding new dependencies unless they are clearly necessary.
- Reuse existing helpers and composables before adding new abstractions.

## Editing guidance

- When editing Vue features, check related files in `components/`, `pages/`, and `composables/` for consistency.
- Preserve existing Japanese UI labels and error messages unless the task asks to change them.
- Prefer minimal changes that fit the current structure and naming.

## What to avoid

- Do not convert Vue components to React-style JSX patterns.
- Do not move server logic into client components.
- Do not add global state libraries unless explicitly requested.
- Do not rewrite working code just to change style.