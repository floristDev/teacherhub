# Entity Generation Reference

> Covers: patterns for generating entity CRUD — list/detail/new/edit pages, API routes, server actions, relationship handling.

## What Gets Generated Per Entity

For each `entity` in `spec.entities` where `entity.isUserFacing === true`, generator.ts emits:

```
src/app/(dashboard)/dashboard/{slug}s/
  page.tsx          # List page
  new/page.tsx      # New entity form
  [id]/page.tsx     # Detail page
  [id]/edit/page.tsx  # Edit form
  actions.ts        # Server actions (create, update, delete)

src/app/api/v1/{slug}s/
  route.ts          # GET (list), POST (create)
  [id]/route.ts     # GET (detail), PUT (update), DELETE
```

Generator loop in `src/core/generator.ts`:
```typescript
for (const entity of spec.entities) {
  if (entity.isUserFacing) {
    const entityCtx = { ...ctx, entity };
    const basePath = `src/app/(dashboard)/dashboard/${entity.slug}s`;
    files.push({ path: `${basePath}/page.tsx`,
                 content: render('dashboard/entity-list.page.tsx.hbs', entityCtx) });
    // ... etc
  }
}
```

## Template Context for Entity Templates

Entity templates receive `{ spec, entity, timestamp, version }`. The key fields on `entity`:

```typescript
entity = {
  name: 'Invoice',           // PascalCase
  slug: 'invoice',           // kebab-case, URL-safe
  fields: Field[],           // Array of field definitions
  relationships: Relationship[],
  belongsToOrg: true,        // Always true for tenant-scoped entities
  isUserFacing: true,        // Only true entities get pages generated
}
```

Field structure:
```typescript
field = {
  name: 'amount',            // camelCase
  type: 'float',             // LFG type (string, text, int, float, boolean, datetime, enum, json)
  required: true,
  unique: false,
  defaultValue?: 'USD',      // String representation
  enumValues?: ['draft', 'sent', 'paid'],  // Only for type === 'enum'
}
```

## List Page Template Pattern

```hbs
{{fileHeader}}
import { requireOrg } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default async function {{pascalCase entity.name}}ListPage() {
  const user = await requireOrg();
  const items = await db.{{camelCase entity.name}}.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{{pascalCase entity.name}}s</h1>
        <Button asChild>
          <Link href="/dashboard/{{entity.slug}}s/new">New {{pascalCase entity.name}}</Link>
        </Button>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              {{#each entity.fields}}
              <TableHead>{{capitalize name}}</TableHead>
              {{/each}}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                {{#each entity.fields}}
                <TableCell>{item.{{name}} }</TableCell>
                {{/each}}
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/dashboard/{{entity.slug}}s/${item.id}`}>View</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
```

Note the space before `}` in `{item.{{name}} }` — required to prevent triple-brace collision.

## New/Edit Form Template Pattern

```hbs
{{fileHeader}}
import { create{{pascalCase entity.name}} } from './actions';

export default function New{{pascalCase entity.name}}Page() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">New {{pascalCase entity.name}}</h1>
      <form action={create{{pascalCase entity.name}} } className="space-y-4">
        {{#each entity.fields}}
        <div className="space-y-2">
          <label className="text-sm font-medium">{{capitalize name}}</label>
          {{#if (eq type "enum")}}
          <select name="{{name}}" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm">
            {{#each enumValues}}
            <option value="{{this}}">{{capitalize this}}</option>
            {{/each}}
          </select>
          {{else if (eq type "text")}}
          <textarea name="{{name}}" rows="4" className="flex w-full rounded-md border bg-background px-3 py-2 text-sm" />
          {{else if (eq type "boolean")}}
          <input type="checkbox" name="{{name}}" />
          {{else}}
          <input type="{{inputType type}}" name="{{name}}" {{#if required}}required{{/if}} className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" />
          {{/if}}
        </div>
        {{/each}}
        <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-md">
          Create {{pascalCase entity.name}}
        </button>
      </form>
    </div>
  );
}
```

## Actions Template Pattern

```hbs
{{fileHeader}}
"use server";

import { requireOrg } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function create{{pascalCase entity.name}}(formData: FormData) {
  const user = await requireOrg();
  {{#each entity.fields}}
  const {{name}} = formData.get('{{name}}') as string;
  {{/each}}

  const item = await db.{{camelCase entity.name}}.create({
    data: {
      {{#each entity.fields}}
      {{name}},
      {{/each}}
      organizationId: user.organizationId,
    },
  });

  revalidatePath('/dashboard/{{entity.slug}}s');
  redirect(`/dashboard/{{entity.slug}}s/${item.id}`);
}

export async function update{{pascalCase entity.name}}(id: string, formData: FormData) {
  const user = await requireOrg();
  const existing = await db.{{camelCase entity.name}}.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!existing) throw new Error('Not found');

  {{#each entity.fields}}
  const {{name}} = formData.get('{{name}}') as string;
  {{/each}}

  await db.{{camelCase entity.name}}.update({
    where: { id },
    data: { {{#each entity.fields}}{{name}}, {{/each}} },
  });

  revalidatePath(`/dashboard/{{entity.slug}}s/${id}`);
  revalidatePath('/dashboard/{{entity.slug}}s');
}

export async function delete{{pascalCase entity.name}}(id: string) {
  const user = await requireOrg();
  const existing = await db.{{camelCase entity.name}}.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!existing) throw new Error('Not found');

  await db.{{camelCase entity.name}}.delete({ where: { id } });

  revalidatePath('/dashboard/{{entity.slug}}s');
  redirect('/dashboard/{{entity.slug}}s');
}
```

## API Route Template Pattern

```hbs
{{fileHeader}}
import { NextResponse } from 'next/server';
import { requireOrg } from '@/lib/auth-utils';
import { db } from '@/lib/db';

// GET /api/v1/{{entity.slug}}s
export async function GET() {
  const user = await requireOrg();
  const items = await db.{{camelCase entity.name}}.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(items);
}

// POST /api/v1/{{entity.slug}}s
export async function POST(req: Request) {
  const user = await requireOrg();
  const body = await req.json() as Record<string, unknown>;
  const item = await db.{{camelCase entity.name}}.create({
    data: { ...body, organizationId: user.organizationId },
  });
  return NextResponse.json(item, { status: 201 });
}
```

## Relationship Handling in Templates

Relationships are stored on `entity.relationships` as `{ type: 'belongsTo' | 'hasMany', target: 'Client' }`.

In the Prisma schema template, emit FK fields for `belongsTo` relationships:
```hbs
{{#each entity.relationships}}
{{#if (eq type "belongsTo")}}
{{camelCase target}}Id String
{{camelCase target}}   {{target}} @relation(fields: [{{camelCase target}}Id], references: [id])
{{/if}}
{{/each}}
```

In form templates, render a select for `belongsTo` relationships — the parent records must be
fetched server-side and passed to the form component.

## Gotchas

- In JSX template expressions like `{item.{{name}} }`, always include the space before `}`. See handlebars-gotchas.md.
- `entity.slug` is already lowercase kebab-case — do not apply `kebabCase` helper again.
- `db.{{camelCase entity.name}}` — Prisma client property names are camelCase of the model name.
- The `actions.ts` file must have `"use server"` as the very first line (before any imports).
- `redirect()` inside an action throws internally — do not wrap in try/catch.
- For numeric fields, parse FormData strings: `parseFloat(formData.get('amount') as string)`.
