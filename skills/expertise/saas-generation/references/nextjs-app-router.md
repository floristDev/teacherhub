# Next.js App Router Reference

> Covers: file-based routing, layout nesting, server components by default, loading/error states,
> route groups, metadata API, parallel routes, API route conventions.

## File-Based Routing Conventions

```
src/app/
  layout.tsx                    # Root layout — wraps everything
  globals.css                   # Global styles (imported in root layout)
  (marketing)/                  # Route group — no URL segment
    page.tsx                    # Renders at /
    pricing/
      page.tsx                  # Renders at /pricing
    layout.tsx                  # Marketing-specific layout
  (auth)/                       # Route group
    login/page.tsx              # Renders at /login
    signup/page.tsx             # Renders at /signup
    layout.tsx                  # Auth-specific layout (centered card, etc.)
  (dashboard)/                  # Route group — authenticated area
    dashboard/
      page.tsx                  # /dashboard
      settings/page.tsx         # /dashboard/settings
      team/page.tsx             # /dashboard/team
      invoices/
        page.tsx                # /dashboard/invoices (list)
        new/page.tsx            # /dashboard/invoices/new
        [id]/
          page.tsx              # /dashboard/invoices/[id] (detail)
          edit/page.tsx         # /dashboard/invoices/[id]/edit
    layout.tsx                  # Dashboard layout (sidebar + header)
  api/
    auth/[...nextauth]/
      route.ts                  # Auth.js catch-all route
    billing/
      checkout/route.ts         # POST /api/billing/checkout
      portal/route.ts           # POST /api/billing/portal
    webhooks/
      stripe/route.ts           # POST /api/webhooks/stripe
    v1/
      invoices/
        route.ts                # GET, POST /api/v1/invoices
        [id]/route.ts           # GET, PUT, DELETE /api/v1/invoices/[id]
```

## Server Components (Default)

All `page.tsx`, `layout.tsx`, and component files are Server Components by default.
They can `await` data fetches directly — no useEffect, no loading state needed for initial data.

```typescript
// src/app/(dashboard)/dashboard/invoices/page.tsx
import { requireOrg } from '@/lib/auth-utils';
import { db } from '@/lib/db';

export default async function InvoicesPage() {
  const user = await requireOrg();
  const invoices = await db.invoice.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <h1>Invoices</h1>
      {invoices.map(invoice => (
        <div key={invoice.id}>{invoice.number}</div>
      ))}
    </div>
  );
}
```

## Client Components

Add `"use client"` only when the component needs:
- Browser APIs (localStorage, window, document)
- React state (`useState`, `useReducer`)
- Event handlers that cannot be server actions
- Third-party client-only libraries

```typescript
"use client";
import { useState } from 'react';

export function ToggleButton({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  return <button onClick={() => setOpen(!open)}>{label}</button>;
}
```

## Layout Nesting

Layouts wrap their child pages. They do not re-render on navigation within their segment.

```typescript
// src/app/(dashboard)/layout.tsx
import { requireAuth } from '@/lib/auth-utils';
import { Sidebar } from '@/components/layouts/sidebar';
import { Header } from '@/components/layouts/header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth(); // Redirect to /login if not authenticated
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
```

## Loading and Error States

```typescript
// src/app/(dashboard)/dashboard/invoices/loading.tsx
export default function Loading() {
  return <div className="animate-pulse">Loading invoices...</div>;
}

// src/app/(dashboard)/dashboard/invoices/error.tsx
"use client";
export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div>
      <p>Something went wrong: {error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

## Dynamic Route Segments

```typescript
// src/app/(dashboard)/dashboard/invoices/[id]/page.tsx
import { requireOrg } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireOrg();

  const invoice = await db.invoice.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!invoice) notFound();

  return <div>{invoice.number}</div>;
}
```

Note: In Next.js 15+, `params` is a Promise and must be awaited.

## API Route Handlers

```typescript
// src/app/api/v1/invoices/route.ts
import { NextResponse } from 'next/server';
import { requireOrg } from '@/lib/auth-utils';
import { db } from '@/lib/db';

export async function GET() {
  const user = await requireOrg();
  const invoices = await db.invoice.findMany({
    where: { organizationId: user.organizationId },
  });
  return NextResponse.json(invoices);
}

export async function POST(req: Request) {
  const user = await requireOrg();
  const body = await req.json() as { number: string; amount: number };
  const invoice = await db.invoice.create({
    data: { ...body, organizationId: user.organizationId },
  });
  return NextResponse.json(invoice, { status: 201 });
}
```

## Metadata API

```typescript
// Static metadata
export const metadata = {
  title: 'Invoices | MyApp',
  description: 'Manage your invoices',
};

// Dynamic metadata
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await db.invoice.findUnique({ where: { id } });
  return { title: `Invoice ${invoice?.number} | MyApp` };
}
```

## Route Groups

Parentheses `(name)` create route groups — they organize files without adding URL segments.
Use them to share layouts between routes without affecting the URL structure:
- `(marketing)` — public pages with marketing layout
- `(auth)` — login/signup with centered card layout
- `(dashboard)` — authenticated pages with sidebar layout

## notFound() and redirect()

```typescript
import { notFound, redirect } from 'next/navigation';

// Renders the nearest not-found.tsx or 404 page
if (!item) notFound();

// Server-side redirect (works in Server Components and Server Actions)
if (!user) redirect('/login');
```

## Gotchas

- `params` is a Promise in Next.js 15+ — always `await params` before destructuring.
- `searchParams` is also a Promise in Next.js 15+ — `const { page } = await searchParams`.
- Do not use `cookies()` or `headers()` in layouts — they opt into dynamic rendering for the entire subtree.
- `"use client"` propagates down — if a parent is a client component, all its children are too.
- Route handlers (`route.ts`) cannot coexist with `page.tsx` at the same path segment.
