# Multi-Tenancy Reference

> Covers: row-level isolation via organizationId FK, session derivation, indexes, query patterns, middleware enforcement.

## The Core Rule

Every tenant-scoped Prisma model gets an `organizationId` foreign key. Every query, server action, and API route filters by `organizationId` sourced from the authenticated session — never from user input.

## Prisma Model Pattern

```prisma
model Resource {
  id             String       @id @default(cuid())
  organizationId String
  // ... domain fields
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  @@index([organizationId])
}
```

Required for every tenant-scoped model:
- `organizationId String` — the FK
- `@relation` pointing to `Organization`
- `@@index([organizationId])` — for query performance
- `onDelete: Cascade` on the relation — deleting an org deletes its data

## Organization and Membership Models

```prisma
model Organization {
  id               String               @id @default(cuid())
  name             String
  slug             String               @unique
  stripeCustomerId String?              @unique
  createdAt        DateTime             @default(now())
  updatedAt        DateTime             @updatedAt
  members          OrganizationMember[]
  subscription     Subscription?
}

model OrganizationMember {
  id             String       @id @default(cuid())
  organizationId String
  userId         String
  role           String       @default("MEMBER")
  createdAt      DateTime     @default(now())
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([organizationId, userId])
  @@index([organizationId])
  @@index([userId])
}
```

## Session Derivation

`organizationId` is set at JWT creation time from the user's first membership:

```typescript
// In Auth.js jwt callback (auth.ts)
async jwt({ token, user }) {
  if (user) {
    const membership = await db.organizationMember.findFirst({
      where: { userId: user.id },
      select: { organizationId: true, role: true },
    });
    token.organizationId = membership?.organizationId ?? null;
    token.role = membership?.role ?? 'MEMBER';
  }
  return token;
},
```

Then accessed in any Server Component or API route:

```typescript
const user = await requireOrg(); // throws if no organizationId
const { organizationId } = user;
```

## Query Patterns

Always scope reads by organizationId:

```typescript
// List
const items = await db.resource.findMany({
  where: { organizationId },
  orderBy: { createdAt: 'desc' },
});

// Single — also verify organizationId to prevent cross-tenant reads
const item = await db.resource.findFirst({
  where: { id, organizationId },
});
if (!item) throw new Error('Not found');

// Create — set organizationId from session, never from body
const item = await db.resource.create({
  data: {
    ...validatedData,
    organizationId,   // from session
  },
});

// Update — verify ownership before write
const existing = await db.resource.findFirst({ where: { id, organizationId } });
if (!existing) throw new Error('Not found');
await db.resource.update({ where: { id }, data: validatedData });

// Delete — same pattern
const existing = await db.resource.findFirst({ where: { id, organizationId } });
if (!existing) throw new Error('Not found');
await db.resource.delete({ where: { id } });
```

## Cross-Entity Validation

When creating a record that references another tenant-scoped entity, verify both belong to the same org:

```typescript
// Example: creating an Invoice that references a Client
async function createInvoice(data: { clientId: string; ... }, organizationId: string) {
  // Verify the client belongs to this org before linking
  const client = await db.client.findFirst({
    where: { id: data.clientId, organizationId },
  });
  if (!client) throw new Error('Client not found in this organization');

  return db.invoice.create({
    data: { ...data, organizationId },
  });
}
```

## Server Action Pattern

```typescript
'use server';
import { requireOrg } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createResource(formData: FormData) {
  const user = await requireOrg();
  const { organizationId } = user;

  // Parse and validate input
  const name = formData.get('name') as string;
  if (!name) throw new Error('Name is required');

  await db.resource.create({
    data: { name, organizationId },
  });

  revalidatePath('/dashboard/resources');
}
```

## API Route Pattern

```typescript
import { NextResponse } from 'next/server';
import { requireOrg } from '@/lib/auth-utils';
import { db } from '@/lib/db';

export async function GET() {
  const user = await requireOrg();
  const items = await db.resource.findMany({
    where: { organizationId: user.organizationId },
  });
  return NextResponse.json(items);
}
```

## Indexes and Performance

- Always add `@@index([organizationId])` — most queries start with this filter.
- For compound filters (e.g., status + organizationId), add `@@index([organizationId, status])`.
- For lookups by unique field within an org: `@@unique([organizationId, slug])`.

## Seed Data

All seed records must be created within the same organization:

```typescript
const org = await db.organization.create({ data: { name: 'Acme', slug: 'acme' } });
const user = await db.user.create({ data: { email: 'admin@acme.com', ... } });
await db.organizationMember.create({
  data: { organizationId: org.id, userId: user.id, role: 'ADMIN' },
});
// All domain records reference org.id
await db.resource.create({ data: { name: 'Sample', organizationId: org.id } });
```

## Gotchas

- Never trust `organizationId` from the request body — always derive from session.
- `findFirst` with `{ where: { id, organizationId } }` is the correct ownership check. `findUnique` on id alone is unsafe.
- Related records across tenants must be validated before linking (see Cross-Entity Validation above).
- If a user can belong to multiple orgs, you need an org-switcher UI and `currentOrganizationId` in the JWT.
- `onDelete: Cascade` on the Organization relation ensures cleanup when an org is deleted.
