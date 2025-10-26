# Wardope AI Simulation

An AI-powered simulation application built with modern web technologies.

## Tech Stack

- **SvelteKit 2** - Full-stack web framework
- **Svelte 5** - Reactive UI framework
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS v4** - Utility-first CSS framework
- **Vite** - Next-generation build tool

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm, pnpm, or yarn

### Installation

Install dependencies:

```sh
npm install
```

### Development

Start the development server:

```sh
npm run dev
```

Open the application in your browser:

```sh
npm run dev -- --open
```

The development server includes hot module replacement (HMR) for a smooth development experience.

### Type Checking

Run TypeScript type checking:

```sh
npm run check
```

Watch mode for continuous type checking:

```sh
npm run check:watch
```

## Building for Production

Create a production build:

```sh
npm run build
```

Preview the production build locally:

```sh
npm run preview
```

## Project Structure

```
wardope-ai/
├── src/
│   ├── routes/          # SvelteKit routes
│   ├── lib/             # Shared components and utilities
│   ├── app.html         # HTML template
│   ├── app.css          # Global styles
│   └── app.d.ts         # TypeScript declarations
├── static/              # Static assets
└── ...config files
```

## Deployment

This project uses `@sveltejs/adapter-auto` which automatically detects your deployment environment. For specific platforms, you may need to install a different [adapter](https://svelte.dev/docs/kit/adapters).

## Learn More

- [SvelteKit Documentation](https://svelte.dev/docs/kit)
- [Svelte 5 Documentation](https://svelte.dev/docs/svelte)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
