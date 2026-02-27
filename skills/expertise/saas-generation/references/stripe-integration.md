# Stripe Integration Reference

> Covers: checkout flow, webhook handling (5 event types), subscription sync, Customer Portal, error handling.

## File Layout

```
src/lib/stripe.ts                           # Stripe client singleton
src/app/api/billing/checkout/route.ts       # Create Checkout Session
src/app/api/billing/portal/route.ts         # Create Customer Portal session
src/app/api/webhooks/stripe/route.ts        # Webhook handler
```

## Stripe Client Singleton (src/lib/stripe.ts)

```typescript
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
});
```

## Checkout Flow (src/app/api/billing/checkout/route.ts)

```typescript
import { NextResponse } from 'next/server';
import { requireOrg } from '@/lib/auth-utils';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const user = await requireOrg();
  const { priceId } = await req.json() as { priceId: string };

  // Get or create Stripe customer on the organization
  let org = await db.organization.findUnique({
    where: { id: user.organizationId },
    select: { id: true, name: true, stripeCustomerId: true },
  });
  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: org.name,
      metadata: { organizationId: org.id },
    });
    customerId = customer.id;
    await db.organization.update({
      where: { id: org.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?billing=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?billing=cancelled`,
    metadata: { organizationId: org.id },
  });

  return NextResponse.json({ url: session.url });
}
```

## Customer Portal (src/app/api/billing/portal/route.ts)

```typescript
import { NextResponse } from 'next/server';
import { requireOrg } from '@/lib/auth-utils';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';

export async function POST() {
  const user = await requireOrg();
  const org = await db.organization.findUnique({
    where: { id: user.organizationId },
    select: { stripeCustomerId: true },
  });

  if (!org?.stripeCustomerId) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 400 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`,
  });

  return NextResponse.json({ url: session.url });
}
```

## Webhook Handler (src/app/api/webhooks/stripe/route.ts)

```typescript
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import Stripe from 'stripe';

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    // Always return 400 for invalid signatures — this is the one exception to the 200 rule
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoiceSucceeded(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await handleInvoiceFailed(event.data.object as Stripe.Invoice);
        break;
    }
  } catch (err) {
    // Return 200 even on internal errors — prevents Stripe from retrying indefinitely
    console.error('Webhook processing error:', err);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  // Look up org by stripeCustomerId — don't rely on metadata alone
  const org = await db.organization.findUnique({
    where: { stripeCustomerId: customerId },
  });
  if (!org) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await db.subscription.upsert({
    where: { organizationId: org.id },
    create: {
      organizationId: org.id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: subscription.items.data[0]?.price.id,
      status: 'ACTIVE',
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
    update: {
      stripeSubscriptionId: subscriptionId,
      stripePriceId: subscription.items.data[0]?.price.id,
      status: 'ACTIVE',
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  await db.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: subscription.status.toUpperCase() as string,
      stripePriceId: subscription.items.data[0]?.price.id,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await db.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: { status: 'CANCELED' },
  });
}

async function handleInvoiceSucceeded(invoice: Stripe.Invoice) {
  // Optional: send receipt email via Resend
  console.log('Invoice payment succeeded:', invoice.id);
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  // Optional: notify user of failed payment
  console.log('Invoice payment failed:', invoice.id);
}
```

## Prisma Model

```prisma
enum SubscriptionStatus {
  TRIALING
  ACTIVE
  PAST_DUE
  CANCELED
  UNPAID
}

model Subscription {
  id                   String             @id @default(cuid())
  organizationId       String             @unique
  stripeCustomerId     String?            @unique
  stripeSubscriptionId String?            @unique
  stripePriceId        String?
  status               SubscriptionStatus @default(TRIALING)
  currentPeriodEnd     DateTime?
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt
  organization         Organization       @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  @@index([organizationId])
}
```

## Environment Variables Required

```
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_APP_URL=https://yourapp.com
```

## Gotchas

- Always verify webhook signature with `stripe.webhooks.constructEvent()` before processing.
- Store `stripeCustomerId` on the **organization**, not the user. Subscriptions are org-level.
- Look up organization by `stripeCustomerId` in webhooks — metadata can be missing on some event types.
- Use `@unique` on both `stripeCustomerId` and `stripeSubscriptionId` to allow upsert lookups.
- Return HTTP 200 from all webhook paths except invalid signature. Stripe retries on any non-200.
- To cancel a subscription at period end: `stripe.subscriptions.update(id, { cancel_at_period_end: true })`. Do NOT use `stripe.subscriptions.cancel()` unless immediate cancellation is intended.
- Test webhooks locally: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.
