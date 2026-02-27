# TeacherHub — AI Development Guide

This file contains instructions for AI assistants (Claude, Cursor, Copilot, etc.) continuing development on this codebase.

---

## Project Overview

**TeacherHub** is a SaaS application built with Next.js 14 App Router, Prisma, Auth.js v5, and Stripe.

> A teacher data hub SaaS that connects student data across different school systems like Google Classroom, Clever, PowerSchool, and Canvas. Teachers can create and store document templates shared via Google Drive where they can type freely without constraints. Store information organized by student with unique identifiers. Features include student profiles, document templates, data import from multiple systems, notes per student, report generation, and team collaboration for teaching teams.

---

## Tech Stack

| Concern | Technology | Notes |
|---------|-----------|-------|
| Framework | Next.js 14 (App Router) | Use Server Components by default |
| Language | TypeScript (strict mode) | No `any` types |
| Database ORM | Prisma | Schema at `prisma/schema.prisma` |
| Auth | Auth.js v5 (`next-auth`) | Config at `lib/auth.ts` |
| Billing | Stripe | Config at `lib/stripe.ts` |
| Email | Resend | Templates at `emails/` |
| Styling | Tailwind CSS + shadcn/ui | CSS vars in `app/globals.css` |
| Validation | Zod | Validate all inputs at the boundary |
| Forms | React Hook Form + Zod resolver | Use `useForm` with `zodResolver` |

---

## Project Structure

```
app/
├── (auth)/                  # Sign-in, sign-up, verify pages
├── (dashboard)/             # Authenticated app pages
│   ├── layout.tsx           # Dashboard shell with sidebar
│   └── [feature]/           # Feature-specific pages
├── (marketing)/             # Public landing pages
├── api/
│   ├── auth/[...nextauth]/  # Auth.js API route
│   └── webhooks/stripe/     # Stripe webhook handler
└── layout.tsx               # Root layout (fonts, providers)

components/
├── ui/                      # shadcn/ui primitives (Button, Card, etc.)
├── forms/                   # Reusable form components
└── [feature]/               # Feature-specific components

lib/
├── auth.ts                  # Auth.js config (providers, callbacks)
├── db.ts                    # Prisma client singleton
├── stripe.ts                # Stripe client + plan config
├── validations/             # Zod schemas
└── utils.ts                 # cn() and misc helpers

prisma/
├── schema.prisma            # Database schema
└── seed.ts                  # Database seed script

types/
└── index.ts                 # Shared TypeScript types
```

---

## Entities

### Report


Fields: `title` (string), `type` (enum), `data` (json), `generatedAt` (datetime)

### Document


Fields: `title` (string), `type` (enum), `url` (string), `size` (int)


---

## Conventions

### Server vs Client Components
- Default to **Server Components** for data fetching and rendering
- Use `'use client'` only when you need interactivity (state, effects, event handlers)
- Pass data from Server Components down to Client Components as props

### Data Fetching
- Fetch data in Server Components using async/await with Prisma
- Never expose raw Prisma queries to the client
- Use Server Actions for mutations (form submissions, updates, deletes)
- Validate all Server Action inputs with Zod

```typescript
// lib/actions/example.ts
'use server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

const schema = z.object({ name: z.string().min(1) });

export async function createExample(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const input = schema.parse({ name: formData.get('name') });
  return db.example.create({ data: { ...input, userId: session.user.id } });
}
```

### Authentication
- Use `auth()` from `@/lib/auth` in Server Components and Server Actions
- Use `useSession()` from `next-auth/react` in Client Components
- Protect routes with middleware (`middleware.ts`) and by checking session in layouts

### Database Access
- Always use the Prisma singleton from `@/lib/db`
- Use `select` to avoid over-fetching
- Add indexes for fields used in `where` clauses

```typescript
import { db } from '@/lib/db';
const items = await db.item.findMany({
  where: { organizationId: orgId },
  select: { id: true, name: true, createdAt: true },
  orderBy: { createdAt: 'desc' },
});
```

### Styling
- Use Tailwind utility classes exclusively — no custom CSS files except `globals.css`
- Use the `cn()` helper from `@/lib/utils` to merge conditional classes
- Use shadcn/ui components as the foundation; customize via `className` prop
- Respect the CSS variable color system — use semantic tokens like `bg-background`, `text-foreground`, `border`

### Error Handling
- Use `try/catch` in Server Actions and return `{ error: string }` on failure
- Use Next.js `error.tsx` boundaries for page-level errors
- Log errors server-side; never expose stack traces to the client

### File Naming
- Components: PascalCase (`UserProfile.tsx`)
- Utilities / libs: camelCase (`formatDate.ts`)
- Route handlers: lowercase (`route.ts`)
- Server Actions: camelCase in `lib/actions/` directory

---

## Adding a New Feature

1. **Add Prisma model** — update `prisma/schema.prisma`, run `npm run db:push`
2. **Add Zod validation schema** — create `lib/validations/[feature].ts`
3. **Add Server Actions** — create `lib/actions/[feature].ts`
4. **Add API route if needed** — create `app/api/[feature]/route.ts`
5. **Build UI** — create page at `app/(dashboard)/[feature]/page.tsx`
6. **Add navigation link** — update the sidebar/nav component

---

## Billing Plans

- **Starter** (`starter`): $29/month
- **Pro** (`pro`): $79/month ⭐ highlighted
- **Enterprise** (`enterprise`): $199/month

Stripe plan slugs are stored on the `Organization` model. Check `lib/stripe.ts` for plan metadata and feature gate helpers.

---

## Roles & Permissions

- **Owner** (`owner`): `*`
- **Admin** (`admin`): `read, write, delete, invite`
- **Member** (`member`): `read, write`

Check permissions in Server Actions by reading `membership.role` from the database after authenticating the user.

---

## Environment Variables

All required environment variables are documented in `.env.example`. Copy it to `.env.local` for local development. In production, set them in your hosting provider's dashboard.

---

## Common Tasks

### Reset the database
```bash
docker compose down -v && docker compose up -d && npm run db:push && npm run db:seed
```

### Add a shadcn/ui component
```bash
npx shadcn@latest add [component-name]
```

### Open the database GUI
```bash
npm run db:studio
```

### Test Stripe webhooks locally
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```
