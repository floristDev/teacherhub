# Server Actions Reference

> Covers: Next.js Server Actions for form handling, revalidation, optimistic updates, error handling, auth checks.

## What Server Actions Are

Server Actions are async functions marked with `"use server"` that run on the server when called
from a Client Component form or event handler. They replace API routes for mutation operations
in App Router apps. LFG generates them in `actions.ts` files co-located with entity pages.

## File Location Convention

```
src/app/(dashboard)/dashboard/invoices/actions.ts   # Entity-specific actions
src/app/(dashboard)/dashboard/settings/actions.ts   # Settings actions
```

## Basic Action Pattern

```typescript
"use server";

import { requireOrg } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createInvoice(formData: FormData) {
  // 1. Auth check — always first
  const user = await requireOrg();

  // 2. Parse and validate inputs
  const number = formData.get('number') as string;
  const amount = parseFloat(formData.get('amount') as string);
  if (!number || isNaN(amount)) {
    throw new Error('Invalid input');
  }

  // 3. Write to DB with organizationId from session
  const invoice = await db.invoice.create({
    data: {
      number,
      amount,
      organizationId: user.organizationId,
      status: 'DRAFT',
      dueDate: new Date(),
    },
  });

  // 4. Revalidate affected pages
  revalidatePath('/dashboard/invoices');

  // 5. Redirect to new record (optional)
  redirect(`/dashboard/invoices/${invoice.id}`);
}
```

## Update Action Pattern

```typescript
export async function updateInvoice(id: string, formData: FormData) {
  const user = await requireOrg();

  // Verify ownership before update
  const existing = await db.invoice.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!existing) throw new Error('Invoice not found');

  const amount = parseFloat(formData.get('amount') as string);

  await db.invoice.update({
    where: { id },
    data: { amount },
  });

  revalidatePath(`/dashboard/invoices/${id}`);
  revalidatePath('/dashboard/invoices');
}
```

## Delete Action Pattern

```typescript
export async function deleteInvoice(id: string) {
  const user = await requireOrg();

  const existing = await db.invoice.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!existing) throw new Error('Invoice not found');

  await db.invoice.delete({ where: { id } });

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}
```

## Using Actions in Forms (Server Component)

```typescript
// page.tsx — Server Component, no "use client" needed
import { createInvoice } from './actions';

export default function NewInvoicePage() {
  return (
    <form action={createInvoice}>
      <input name="number" placeholder="INV-001" required />
      <input name="amount" type="number" step="0.01" required />
      <button type="submit">Create Invoice</button>
    </form>
  );
}
```

## Using Actions in Client Components (with useFormState / useActionState)

```typescript
"use client";

import { useActionState } from 'react';
import { createInvoice } from './actions';

type ActionState = { error?: string } | null;

export function InvoiceForm() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      try {
        await createInvoice(formData);
        return null;
      } catch (err) {
        return { error: (err as Error).message };
      }
    },
    null
  );

  return (
    <form action={formAction}>
      {state?.error && <p className="text-destructive">{state.error}</p>}
      <input name="number" placeholder="INV-001" required />
      <input name="amount" type="number" step="0.01" required />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Invoice'}
      </button>
    </form>
  );
}
```

## Inline Action with bind (for delete buttons, status toggles)

```typescript
// Server Component
import { deleteInvoice } from './actions';

export function DeleteButton({ id }: { id: string }) {
  const deleteWithId = deleteInvoice.bind(null, id);
  return (
    <form action={deleteWithId}>
      <button type="submit" className="text-destructive">Delete</button>
    </form>
  );
}
```

## Revalidation Patterns

```typescript
import { revalidatePath, revalidateTag } from 'next/cache';

// Revalidate a specific page
revalidatePath('/dashboard/invoices');

// Revalidate a dynamic page
revalidatePath(`/dashboard/invoices/${id}`);

// Revalidate an entire segment and all children
revalidatePath('/dashboard', 'layout');

// Tag-based revalidation (for fetch cache)
revalidateTag('invoices');
```

## Error Handling Patterns

Server Actions throw errors that bubble to the nearest error boundary in the component tree.
For user-facing errors, either:

1. Return an error state object (client components with useActionState)
2. Throw with a descriptive message (caught by error.tsx)

```typescript
// Pattern 1: Return error state
export async function createInvoice(
  prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  try {
    const user = await requireOrg();
    // ... create logic
    revalidatePath('/dashboard/invoices');
    return null;
  } catch (err) {
    return { error: (err as Error).message };
  }
}

// Pattern 2: Throw (caught by error.tsx boundary)
export async function createInvoice(formData: FormData) {
  const user = await requireOrg();
  const number = formData.get('number') as string;
  if (!number) throw new Error('Invoice number is required');
  // ...
}
```

## Auth Check Patterns in Actions

```typescript
// Basic auth check
const user = await requireAuth();

// Requires org membership
const user = await requireOrg();

// Role-specific action
const user = await requireRole('ADMIN', 'OWNER');

// Manual check with custom error
const session = await getCurrentUser();
if (!session) throw new Error('You must be logged in');
if (session.role !== 'ADMIN') throw new Error('Admin access required');
```

## Optimistic Updates (Client Component)

```typescript
"use client";
import { useOptimistic } from 'react';
import { toggleInvoiceStatus } from './actions';

export function InvoiceList({ invoices }: { invoices: Invoice[] }) {
  const [optimisticInvoices, addOptimistic] = useOptimistic(
    invoices,
    (state, updatedInvoice: Invoice) =>
      state.map(i => i.id === updatedInvoice.id ? updatedInvoice : i)
  );

  return (
    <ul>
      {optimisticInvoices.map(invoice => (
        <li key={invoice.id}>
          {invoice.status}
          <button
            onClick={async () => {
              addOptimistic({ ...invoice, status: 'PAID' });
              await toggleInvoiceStatus(invoice.id);
            }}
          >
            Mark Paid
          </button>
        </li>
      ))}
    </ul>
  );
}
```

## Gotchas

- Server Actions must be in files with `"use server"` at the top, or individual functions must have `"use server"` as the first line.
- `redirect()` inside a Server Action throws internally — do not wrap in try/catch or the redirect will be swallowed.
- `revalidatePath` must be called before `redirect` — after redirect the response is already sent.
- FormData values are always strings. Parse numbers with `parseFloat`/`parseInt`, booleans with `=== 'on'`.
- Never trust form input for `organizationId` — always derive from session.
- Actions called with `.bind()` receive the bound arguments before `FormData` in the parameter list.
