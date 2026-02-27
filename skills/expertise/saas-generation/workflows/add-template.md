# Workflow: Add a New Handlebars Template

> When: A new file type needs to be generated that has no existing template.
> Files touched: new `.hbs` file in `templates/`, one `files.push()` call in `src/core/generator.ts`.

## Steps

### 1. Choose the template location

Templates live in category subdirectories under `templates/`. Pick the right one:

```
templates/
  api/          # API route handlers and server actions
  auth/         # Auth configuration and auth pages
  base/         # Config files (package.json, tsconfig, env, etc.)
  billing/      # Stripe routes and webhook handler
  components/   # UI components (auto-loaded as partials)
  dashboard/    # Dashboard pages (list, detail, new, edit)
  database/     # Prisma schema, seed, db client
  email/        # Email utility
  landing/      # Marketing pages
  layouts/      # Layout components (auto-loaded as partials)
```

### 2. Create the .hbs file

Name the file after its output path with `.hbs` appended.
Example: output path `src/lib/analytics.ts` → template name `base/analytics.ts.hbs`

```bash
touch /Users/patrickzimny/Documents/GitHub/lets_fucking_go/templates/base/analytics.ts.hbs
```

### 3. Write the template

Start with `{{fileHeader}}`. Use the available context variables.

Global templates have access to: `spec`, `timestamp`, `version`
Entity templates also have: `entity`

Available helpers: `eq`, `neq`, `lowercase`, `uppercase`, `capitalize`, `camelCase`, `pascalCase`,
`kebabCase`, `pluralize`, `prismaType`, `tsType`, `inputType`, `json`, `jsonInline`, `join`,
`length`, `concat`, `substring`, `and`, `or`, `not`, `fileHeader`, `ifCond`, `first`, `last`,
`includes`, `now`

Example template (`templates/base/analytics.ts.hbs`):
```hbs
{{fileHeader}}
// Analytics client for {{spec.name}}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  console.log('[Analytics]', event, properties);
  // TODO: wire up your analytics provider
}

export function trackPageView(path: string) {
  trackEvent('page_view', { path });
}
```

### 4. Critical: avoid triple-brace collision in JSX templates

If the template emits JSX and uses Handlebars expressions inside JSX attributes or expressions,
add a space before closing delimiters:

```hbs
<!-- WRONG -->
<form action={create{{pascalCase entity.slug}}}>

<!-- CORRECT -->
<form action={create{{pascalCase entity.slug}} }>
```

See `references/handlebars-gotchas.md` for full details.

### 5. Register in generator.ts

Open `src/core/generator.ts`. Add a `files.push()` call in the appropriate section.

For a global file (same regardless of entities):
```typescript
// --- Shared Utilities ---
files.push({ path: 'src/lib/utils.ts', content: render('base/utils.ts.hbs', ctx) });
files.push({ path: 'src/lib/analytics.ts', content: render('base/analytics.ts.hbs', ctx) });  // NEW
```

For a per-entity file (add inside the entity loop):
```typescript
for (const entity of spec.entities) {
  if (entity.isUserFacing) {
    const entityCtx = { ...ctx, entity };
    // ... existing pushes ...
    files.push({
      path: `src/lib/${entity.slug}-utils.ts`,
      content: render('base/entity-utils.ts.hbs', entityCtx),  // NEW
    });
  }
}
```

### 6. Test with dry-run

```bash
npx tsx bin/lfg.ts build "invoice app" --dry-run
```

Confirm the new file path appears in the output file list with no render errors.

### 7. Test with full build

```bash
npx tsx bin/lfg.ts build "invoice app" --skip-install -o /tmp/test-new-template
cat /tmp/test-new-template/src/lib/analytics.ts
```

Verify the output file contains what you expect — no `[object Object]`, no empty sections,
no Handlebars syntax visible in the output.

## Common Mistakes

- Forgetting `{{fileHeader}}` at the top of the template.
- Using `{{{ }}}` (triple braces) for HTML-safe output in JSX contexts — use `{{ }}` and ensure
  the value is already escaped, or use `{{fileHeader}}` which returns a `SafeString`.
- Template path in `render()` is relative to the `templates/` directory, not the project root.
- For partials (components and layouts subdirectories), files are auto-loaded by `initTemplates()` —
  no manual registration needed. They are referenced in other templates as `{{> partialName}}`.
