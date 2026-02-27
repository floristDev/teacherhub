# Auth.js v5 Reference

> Covers: configuration, providers, session threading, middleware, password hashing, role-based access.
> Do NOT apply v4 patterns — the API changed significantly.

## File Layout

```
src/lib/auth.ts          # NextAuth config export
src/lib/auth-utils.ts    # getCurrentUser, requireAuth, requireRole, requireOrg
src/middleware.ts         # Route protection via Auth.js middleware
src/app/api/auth/[...nextauth]/route.ts  # Route handler
```

## Core Configuration (src/lib/auth.ts)

```typescript
import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/auth-utils';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: 'jwt' },   // jwt not database — serverless compatible
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user || !user.password) return null;
        const valid = await verifyPassword(credentials.password as string, user.password);
        if (!valid) return null;
        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Derive organizationId from first membership
        const membership = await db.organizationMember.findFirst({
          where: { userId: user.id },
          select: { organizationId: true, role: true },
        });
        token.organizationId = membership?.organizationId ?? null;
        token.role = membership?.role ?? 'MEMBER';
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.organizationId = token.organizationId as string | null;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
});
```

## Route Handler (src/app/api/auth/[...nextauth]/route.ts)

```typescript
import { handlers } from '@/lib/auth';
export const { GET, POST } = handlers;
```

## Session Type Augmentation (src/types/index.ts)

```typescript
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string;
      organizationId: string | null;
      role: string;
    };
  }
}
```

## Password Hashing — PBKDF2 (no native deps)

Use Web Crypto API instead of bcrypt to avoid native module issues in serverless:

```typescript
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  const hashArray = Array.from(new Uint8Array(bits));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}:${hashHex}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':');
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  const candidateHex = Array.from(new Uint8Array(bits))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return candidateHex === hashHex;
}
```

## Auth Utility Functions (src/lib/auth-utils.ts)

```typescript
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireRole(...roles: string[]) {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    throw new Error('Insufficient permissions');
  }
  return user;
}

export async function requireOrg() {
  const user = await requireAuth();
  if (!user.organizationId) {
    throw new Error('No organization found for user');
  }
  return user as typeof user & { organizationId: string };
}
```

## Middleware (src/middleware.ts)

```typescript
import { auth } from '@/lib/auth';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isDashboard = req.nextUrl.pathname.startsWith('/dashboard');
  if (isDashboard && !isLoggedIn) {
    return Response.redirect(new URL('/login', req.nextUrl));
  }
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

## Prisma Models Required by PrismaAdapter

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  password      String?   // Optional: OAuth users have no password
  role          String    @default("MEMBER")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  accounts      Account[]
  sessions      Session[]
  memberships   OrganizationMember[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}
```

## Gotchas

- `session.strategy = 'jwt'` is required for serverless (Vercel, etc.). Database sessions require sticky connections.
- `PrismaAdapter` expects exact model names: `User`, `Account`, `Session`, `VerificationToken`.
- `password` on User must be `String?` (optional) — OAuth users have no password.
- Auth.js v5 exports `{ handlers, signIn, signOut, auth }` from `NextAuth()`, not a default export.
- In Server Components, use `await auth()` to get session. In Client Components, use `useSession()` from `next-auth/react`.
- The `jwt` callback fires on every token refresh — keep the DB query in `if (user)` block only (runs at sign-in).
- `emailVerified` should be checked in Credentials `authorize` if email verification is part of the flow.
