# Workflow: Improve the NLP Parser

> When: The parser misses keywords, generates wrong field types, builds bad relationships,
> extracts wrong app names, or fails to detect features.
> File: `src/core/parser.ts`

## Parser Architecture

```
parse(description)
  extractAppName(description)       # Regex-based name extraction
  extractEntities(description)      # Keyword matching → entity + field definitions
    addRelationships(entities)      # Pattern-based bidirectional relationship wiring
  extractFeatures(description)      # Keyword matching → feature flags
  extractBillingPlans(description)  # Keyword matching → billing tier config
  generatePages(spec)               # Deterministic from entities (no NLP)
```

## Improving Entity Detection

### Add Keywords to an Existing Entity

Find the entity in `entityPatterns` and extend its `keywords` array:

```typescript
Task: {
  keywords: ['task', 'todo', 'to-do', 'ticket', 'issue', 'card', 'story'],  // added 'card', 'story'
  fields: [ ... ],
},
```

### Fix a Field Type

If a field is generated with the wrong type, update its definition in `entityPatterns`:

```typescript
// Before: price as string
{ name: 'price', type: 'string', required: true, unique: false }

// After: price as float
{ name: 'price', type: 'float', required: true, unique: false }
```

### Add a Missing Field to an Existing Entity

```typescript
Invoice: {
  keywords: ['invoice', 'invoicing', 'billing', 'bill'],
  fields: [
    { name: 'number',   type: 'string',   required: true,  unique: true },
    { name: 'taxRate',  type: 'float',    required: false, unique: false },  // NEW
    { name: 'discount', type: 'float',    required: false, unique: false },  // NEW
    // ...
  ],
},
```

## Improving App Name Extraction

`extractAppName()` runs three regex patterns in priority order, then falls back to significant words.

### Pattern 1 — Explicit name (highest priority)
Matches: `called "X"` or `named "X"`
```typescript
const namedMatch = description.match(/(?:called|named)\s+"?([^"]+)"?/i);
```

### Pattern 2 — Build pattern
Matches: `build me a X SaaS/platform/app`
```typescript
const buildMatch = description.match(
  /(?:build|create|make)\s+(?:me\s+)?(?:a|an)\s+(.+?)(?:\s+(?:saas|platform|app|tool|system|service))/i
);
```

To add new trigger verbs:
```typescript
/(?:build|create|make|generate|scaffold)\s+.../i
```

### Pattern 3 — Domain pattern
Matches: `X SaaS`, `X platform`, `X app`
```typescript
const saasMatch = description.match(/(.+?)(?:\s+(?:saas|platform|app|tool|system|service))/i);
```

To add new domain words:
```typescript
/(.+?)(?:\s+(?:saas|platform|app|tool|system|service|product|solution))/i
```

### Stop Words

Both patterns filter stop words. Add domain-specific stop words to prevent them appearing in names:

```typescript
const stopWords = new Set(['a', 'an', 'the', 'with', 'for', 'and', 'or', 'to', 'in', 'on', 'of',
  'my', 'our', 'your', 'their']);  // add 'my', 'our', etc. to stop unwanted name prefixes
```

## Improving Feature Detection

`featurePatterns` in `extractFeatures()` controls what features are extracted:

```typescript
const featurePatterns = [
  {
    keywords: ['export', 'download', 'pdf'],
    name: 'PDF Export',
    description: 'Generate and download PDF documents',
    scope: 'documents',
  },
  // Add new patterns:
  {
    keywords: ['two-factor', '2fa', 'mfa', 'authenticator'],
    name: 'Two-Factor Authentication',
    description: 'TOTP-based two-factor authentication',
    scope: 'security',
  },
];
```

## Improving Relationship Detection

`relationshipMap` in `addRelationships()` defines which entities relate to which:

```typescript
const relationshipMap: Record<string, string[]> = {
  Invoice: ['Client', 'Document'],
  Order: ['Client', 'Product'],
  Task: ['Project'],
  // Add new relations:
  Contract: ['Client'],
  TimeEntry: ['Project', 'Task'],
};
```

Each entry creates:
- A `belongsTo` relationship on the source entity (e.g., Invoice belongsTo Client)
- A `hasMany` relationship on the target entity (e.g., Client hasMany Invoice)

## Improving Billing Plan Detection

`extractBillingPlans()` currently detects `free tier` and `freemium` keywords.
To add more patterns or custom price points:

```typescript
function extractBillingPlans(description: string): BillingPlan[] | undefined {
  const lower = description.toLowerCase();

  if (lower.includes('enterprise') && lower.includes('self-hosted')) {
    return [
      { name: 'Cloud',      slug: 'cloud',      price: 99,  interval: 'month', features: [...], highlighted: false },
      { name: 'Enterprise', slug: 'enterprise',  price: 499, interval: 'month', features: [...], highlighted: true },
    ];
  }

  if (lower.includes('free tier') || lower.includes('freemium')) {
    return [ /* existing tiers */ ];
  }

  return undefined; // use schema defaults
}
```

## Testing Parser Changes

### Test spec output only (fast)

```bash
npx tsx bin/lfg.ts spec "your test description here"
```

Inspect the JSON output for correct `name`, `entities`, `features`, `billingPlans`.

### Test with multiple descriptions

```bash
npx tsx bin/lfg.ts spec "invoice management for freelancers"
npx tsx bin/lfg.ts spec "project tracker with tasks and time entries"
npx tsx bin/lfg.ts spec "e-commerce platform with products and orders"
```

### Confirm in full build

```bash
npx tsx bin/lfg.ts build "your test description" --skip-install -o /tmp/parser-test
ls /tmp/parser-test/src/app/\(dashboard\)/dashboard/
cat /tmp/parser-test/prisma/schema.prisma
```

## Common Mistakes

- Keywords must be lowercase strings — the parser lowercases the description before matching.
- Adding too many keywords to one entity can cause false positives — prefer specific terms over
  generic ones (e.g., prefer `'receipt'` over `'document'` for a Receipt entity).
- `relationshipMap` is directional — the key is the entity that holds the FK (`belongsTo` side).
- After adding new entity patterns, verify existing descriptions still parse correctly (regression).
- `enumValues` entries must be lowercase — the Prisma schema template uppercases them.
