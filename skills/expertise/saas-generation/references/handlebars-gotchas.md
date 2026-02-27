# Handlebars Gotchas Reference

> Covers: triple-brace JSX collision, Prisma string defaults, common template debugging patterns.
> Both issues here will silently corrupt generated output or cause parse errors at build time.

## Gotcha 1 — Triple-Brace Collision in JSX Contexts

### The Problem

When a Handlebars expression `{{helper arg}}` appears immediately before a JSX closing brace `}`,
the character sequence `}}}` is ambiguous. Handlebars parses `{{helper arg}}}` as an unescaped
output triple-brace `{{{ }}}` instead of `{{ }}` followed by a literal `}`.

```hbs
<!-- WRONG — causes parse error -->
<form action={create{{pascalCase entity.slug}}}>
```

Error produced:
```
Parse error: Expecting 'CLOSE', got 'CLOSE_UNESCAPED'
```

### The Fix

Add a space before the closing JSX brace to separate `}}` from `}`:

```hbs
<!-- CORRECT -->
<form action={create{{pascalCase entity.slug}} }>
```

This renders as `<form action={createInvoice }>` which is valid JSX (whitespace in attribute values is ignored).

### Where This Applies

Any template context where `}}` would be immediately followed by `}`, `)`, `]`, or another closing delimiter:

```hbs
<!-- All of these need a space before the outer closing delimiter -->
<Link href={/dashboard/{{entity.slug}}s }>
onClick={() => handle{{pascalCase entity.slug}}(id) }
const key = `prefix-{{entity.slug}}` }
```

### Prevention Rule

In ALL templates: whenever a Handlebars expression closes `}}` inside a JSX attribute or expression,
add a trailing space before the surrounding closing delimiter.

---

## Gotcha 2 — Prisma String Defaults Must Be Quoted

### The Problem

Prisma schema requires string default values to be wrapped in double quotes. When generating schema
from dynamic field definitions, the `defaultValue` property is a plain string without quotes.

```prisma
// WRONG — Prisma parse error at migration time
currency String @default(USD)
status   String @default(active)
```

Error produced:
```
Error: Failed to parse Prisma schema: Expected a value, found `USD`
```

### The Fix

In the Handlebars schema template, conditionally quote based on field type:

```hbs
{{#if field.defaultValue}}
@default({{#if (or (eq field.type "string") (eq field.type "text"))}}"{{field.defaultValue}}"{{else}}{{field.defaultValue}}{{/if}})
{{/if}}
```

Type-specific quoting rules:
- `string`, `text` → quote: `@default("USD")`
- `boolean` → no quote: `@default(true)`, `@default(false)`
- `int`, `float` → no quote: `@default(0)`, `@default(0.0)`
- `enum` → no quote, use enum value name: `@default(ACTIVE)`
- `datetime` → use `now()` function: `@default(now())`

### Full Field Default Helper Pattern

```hbs
{{#each entity.fields}}
  {{name}} {{prismaType type}}
  {{#if required}}
  {{else}}?{{/if}}
  {{#if unique}} @unique{{/if}}
  {{#if defaultValue}} @default({{#if (or (eq type "string") (eq type "text"))}}"{{defaultValue}}"{{else}}{{defaultValue}}{{/if}}){{/if}}
{{/each}}
```

---

## Common Template Debugging Patterns

### Check What Context Is Available

Add a temporary JSON dump to the template during debugging:

```hbs
<!-- DEBUG: remove before commit -->
<pre>{{json entity}}</pre>
<pre>{{json spec}}</pre>
```

Run with dry-run to see output without writing files:
```bash
npx tsx bin/lfg.ts build "invoice app" --dry-run
```

### Inspect a Specific Template Output

Build to a temp directory to inspect individual files:
```bash
npx tsx bin/lfg.ts build "invoice app" --skip-install -o /tmp/lfg-debug
cat /tmp/lfg-debug/prisma/schema.prisma
cat /tmp/lfg-debug/src/app/api/v1/invoices/route.ts
```

### Helper Not Found Error

```
Missing helper: "myHelper"
```

The helper must be registered in `src/utils/template.ts` with `hbs.registerHelper()` before templates are compiled. `initTemplates()` in generator.ts loads partials but does not auto-discover helpers.

### Partial Not Found Error

```
Missing partial: "myPartial"
```

Partials are loaded from `templates/components/` and `templates/layouts/` by `initTemplates()`. Add your partial `.hbs` file to one of those directories — it is auto-discovered by filename (without extension).

### Undefined Variable Renders as Empty String

Handlebars silently renders `undefined` context values as empty strings. If output is blank where
you expect a value, check:
1. The variable name matches exactly (case-sensitive)
2. The context object has the property at the right nesting level
3. For entity templates: context is `{ spec, entity, timestamp, version }`, not `{ spec, timestamp, version }`

### Enum Values in Prisma Schema

When emitting a Prisma enum from `field.enumValues`, each value must be uppercase and on its own line:

```hbs
enum {{pascalCase entity.name}}{{pascalCase field.name}} {
  {{#each field.enumValues}}
  {{uppercase this}}
  {{/each}}
}
```

### Boolean Logic in Helpers

The `and`, `or`, `not` helpers are block-less (they return values, not render blocks).
Use them as arguments to `{{#if}}`:

```hbs
{{#if (or (eq type "string") (eq type "text"))}}
  "{{defaultValue}}"
{{else}}
  {{defaultValue}}
{{/if}}
```

Do NOT use them as block helpers with `{{#and}}...{{/and}}`.
