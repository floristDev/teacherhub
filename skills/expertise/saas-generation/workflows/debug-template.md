# Workflow: Debug Template Rendering Issues

> When: A template produces wrong output, parse errors, missing variables, broken JSX, or empty sections.

## Step 1 — Identify Which Template Is Failing

Run a dry-run build and read the error message:

```bash
npx tsx bin/lfg.ts build "invoice app" --dry-run 2>&1
```

The error will include the template path (e.g., `dashboard/entity-list.page.tsx.hbs`) and the
Handlebars error type.

## Step 2 — Common Error Types and Fixes

### Parse error: Expecting 'CLOSE', got 'CLOSE_UNESCAPED'

Cause: `{{helper}}` immediately before a JSX closing `}` creates `}}}` which Handlebars reads
as a triple-brace unescaped expression.

Fix: Add a space before the closing delimiter.
```hbs
<!-- Before -->
<form action={create{{pascalCase entity.slug}}}>
<!-- After -->
<form action={create{{pascalCase entity.slug}} }>
```

### Missing helper: "helperName"

Cause: The helper is used in a template but not registered in `src/utils/template.ts`.

Fix: Add `hbs.registerHelper('helperName', ...)` to `src/utils/template.ts` and verify
`initTemplates()` runs before `render()` is called (it does, via `generate()` in generator.ts).

### Missing partial: "partialName"

Cause: A `{{> partialName}}` call refers to a file that does not exist in `templates/components/`
or `templates/layouts/`.

Fix: Create the `.hbs` file in the correct directory. `initTemplates()` auto-discovers files by
filename (without `.hbs` extension) from those two directories only.

### Output field renders as empty or "[object Object]"

Cause: The context variable name is wrong, the nesting level is off, or an object is being
rendered directly instead of a property of it.

Fix — inspect the context:
```hbs
<!-- Add temporarily to the template -->
<pre>{{json entity}}</pre>
<pre>{{json spec}}</pre>
```

Then run:
```bash
npx tsx bin/lfg.ts build "invoice app" --skip-install -o /tmp/debug-output
cat /tmp/debug-output/src/app/\(dashboard\)/dashboard/invoices/page.tsx
```

Remove the debug output before committing.

### Prisma schema parse error after generation

Cause: String field defaults are not quoted.

```prisma
-- Wrong
currency String @default(USD)
-- Correct
currency String @default("USD")
```

Fix: In the schema template, use the conditional quoting pattern:
```hbs
@default({{#if (or (eq field.type "string") (eq field.type "text"))}}"{{field.defaultValue}}"{{else}}{{field.defaultValue}}{{/if}})
```

See `references/handlebars-gotchas.md` for the full pattern.

## Step 3 — Inspect Context Directly

When you are unsure what data is available in a template, add a temporary dump:

```hbs
{{!-- DEBUG START --}}
<script>
// context dump — remove before commit
const _debug = {{json entity}};
console.log(_debug);
</script>
{{!-- DEBUG END --}}
```

Or for non-JSX templates:
```hbs
{{!-- {{json entity}} --}}
```

## Step 4 — Test a Single Template in Isolation

Build to a temp directory targeting a description that exercises the template:

```bash
# For entity templates — use a description that triggers the entity
npx tsx bin/lfg.ts build "invoice app for freelancers" --skip-install -o /tmp/dbg

# Inspect the specific file
cat /tmp/dbg/src/app/\(dashboard\)/dashboard/invoices/page.tsx
cat /tmp/dbg/prisma/schema.prisma
cat /tmp/dbg/src/app/\(dashboard\)/dashboard/invoices/actions.ts
```

## Step 5 — Validate Generated TypeScript

```bash
cd /tmp/dbg && npx tsc --noEmit 2>&1 | head -50
```

TypeScript errors in generated files usually mean:
- An `any` type slipped through (use proper Prisma-generated types)
- A field name mismatch between the template and the Prisma model
- Missing import

## Step 6 — Check Helper Logic

Helpers use positional arguments. Logical helpers (`and`, `or`, `not`) are value-returning,
not block helpers:

```hbs
<!-- Correct: use as argument to #if -->
{{#if (or (eq type "string") (eq type "text"))}}...{{/if}}

<!-- Wrong: do not use as block helper -->
{{#or}}...{{/or}}
```

`ifCond` is a block helper for comparisons:
```hbs
{{#ifCond field.count ">" 0}}has fields{{else}}no fields{{/ifCond}}
```

## Step 7 — Verify Partial Scope

Partials inherit the current scope by default. Pass explicit context with `{{> partial contextVar}}`:

```hbs
{{> field-input field}}       <!-- passes `field` as root context to partial -->
{{> field-input this}}        <!-- passes current loop item -->
{{> field-input entity.fields}}  <!-- wrong — passes array, not an item -->
```

## Checklist Before Marking Fixed

- [ ] `--dry-run` completes with no errors
- [ ] Full build to `/tmp/` completes with no errors
- [ ] Generated file content is correct (inspect with `cat`)
- [ ] No `[object Object]` or raw Handlebars syntax in output
- [ ] `npx tsc --noEmit` passes in the generated project
- [ ] Debug dumps removed from template
