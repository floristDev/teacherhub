# Prisma Patterns Reference

> Covers: schema design for SaaS, common model patterns, relations, indexes, enums, migrations, seed data, client singleton.

## Client Singleton (src/lib/db.ts)

Avoid creating multiple Prisma Client instances in development (hot reload creates new instances):

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

## Schema Header

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## Core SaaS Models

Every generated app includes these base models. Do not omit them.

```prisma
model User {
  id            String               @id @default(cuid())
  name          String?
  email         String               @unique
  emailVerified DateTime?
  image         String?
  password      String?
  createdAt     DateTime             @default(now())
  updatedAt     DateTime             @updatedAt
  accounts      Account[]
  sessions      Session[]
  memberships   OrganizationMember[]
}

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

## Field Type Reference

| LFG field type | Prisma type | Notes |
|---|---|---|
| `string` | `String` | Max 191 chars by default (MySQL). Use `@db.Text` for long strings. |
| `text` | `String` | Add `@db.Text` for PostgreSQL text columns. |
| `int` | `Int` | 32-bit integer. Use `BigInt` for IDs from external systems. |
| `float` | `Float` | 64-bit IEEE 754. Use `Decimal` for money. |
| `boolean` | `Boolean` | |
| `datetime` | `DateTime` | Always UTC in Prisma. |
| `enum` | `String` or enum | Prefer Prisma enums for type safety. |
| `json` | `Json` | PostgreSQL `jsonb`. Not supported in all DB providers. |

## Enums

Prefer Prisma enums over string fields for status columns:

```prisma
enum InvoiceStatus {
  DRAFT
  SENT
  PAID
  OVERDUE
  CANCELLED
}

model Invoice {
  id     String        @id @default(cuid())
  status InvoiceStatus @default(DRAFT)
}
```

Enum values in Prisma must be uppercase. Map to lowercase display values in UI code.

## Relations

### Many-to-One (belongsTo)

```prisma
model Invoice {
  id       String  @id @default(cuid())
  clientId String
  client   Client  @relation(fields: [clientId], references: [id], onDelete: Restrict)
  @@index([clientId])
}

model Client {
  id       String    @id @default(cuid())
  invoices Invoice[]
}
```

Use `onDelete: Restrict` when the referenced record should not be deletable if children exist.
Use `onDelete: Cascade` when children should be deleted with the parent.
Use `onDelete: SetNull` when the FK should be nulled (field must be optional: `clientId String?`).

### Many-to-Many (explicit join table)

```prisma
model Post {
  id   String     @id @default(cuid())
  tags PostTag[]
}

model Tag {
  id    String    @id @default(cuid())
  name  String    @unique
  posts PostTag[]
}

model PostTag {
  postId String
  tagId  String
  post   Post   @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag    Tag    @relation(fields: [tagId], references: [id], onDelete: Cascade)
  @@id([postId, tagId])
}
```

## Indexes

Add indexes wherever queries filter or sort:

```prisma
model Resource {
  id             String   @id @default(cuid())
  organizationId String
  status         String
  createdAt      DateTime @default(now())

  @@index([organizationId])                   // All tenant-scoped queries
  @@index([organizationId, status])           // Filtered list queries
  @@index([organizationId, createdAt(sort: Desc)])  // Sorted list queries
}
```

## Default Values

```prisma
// String defaults — must be quoted
currency  String @default("USD")
status    String @default("active")

// Boolean defaults — no quotes
isActive  Boolean @default(true)
isDeleted Boolean @default(false)

// Numeric defaults — no quotes
quantity  Int   @default(0)
price     Float @default(0.0)

// Timestamp defaults
createdAt DateTime @default(now())

// Generated IDs
id String @id @default(cuid())   // Collision-resistant, URL-safe
id String @id @default(uuid())   // Standard UUID v4
```

## Migrations

```bash
# Create a migration after editing schema.prisma
npx prisma migrate dev --name add_invoice_model

# Apply migrations in production
npx prisma migrate deploy

# Reset DB and re-run all migrations (dev only)
npx prisma migrate reset

# Inspect current DB state
npx prisma studio
```

## Seed File (prisma/seed.ts)

```typescript
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth-utils';

const db = new PrismaClient();

async function main() {
  const org = await db.organization.upsert({
    where: { slug: 'acme' },
    update: {},
    create: { name: 'Acme Corp', slug: 'acme' },
  });

  const user = await db.user.upsert({
    where: { email: 'admin@acme.com' },
    update: {},
    create: {
      email: 'admin@acme.com',
      name: 'Admin User',
      password: await hashPassword('password123'),
    },
  });

  await db.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: user.id } },
    update: {},
    create: { organizationId: org.id, userId: user.id, role: 'ADMIN' },
  });
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
```

Add to package.json:
```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

Run with: `npx prisma db seed`

## Gotchas

- String defaults must be quoted: `@default("USD")` not `@default(USD)`. See handlebars-gotchas.md.
- `@unique` creates an implicit index — do not add `@@index` for the same field.
- `cuid()` is the LFG default for IDs — URL-safe and collision-resistant without coordination.
- Prisma enums are not natively supported by all DB providers. PostgreSQL supports them natively.
- In templates, use the `prismaType` helper to convert LFG field types to Prisma types.
- `Json` type requires PostgreSQL or MongoDB — not available in SQLite.
