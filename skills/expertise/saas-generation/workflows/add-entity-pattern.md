# Workflow: Add a New Entity Pattern to the Parser

> When: The parser does not recognize a domain entity from a user's description.
> File: `src/core/parser.ts` — `entityPatterns` object inside `extractEntities()`.

## Steps

### 1. Identify the entity and its keywords

Decide what the entity is called (PascalCase) and what words in a description should trigger it.
Keywords should be lowercase and cover plurals and synonyms.

Example: adding a `Contract` entity.
Keywords: `['contract', 'contracts', 'agreement', 'agreements', 'nda']`

### 2. Define the fields

Each field needs: `name` (camelCase), `type` (LFG type), `required`, `unique`, and optionally `defaultValue` and `enumValues`.

LFG field types: `string`, `text`, `int`, `float`, `boolean`, `datetime`, `enum`, `json`

```typescript
Contract: {
  keywords: ['contract', 'contracts', 'agreement', 'agreements', 'nda'],
  fields: [
    { name: 'title',      type: 'string',   required: true,  unique: false },
    { name: 'status',     type: 'enum',     required: true,  unique: false,
      enumValues: ['draft', 'sent', 'signed', 'expired', 'cancelled'] },
    { name: 'value',      type: 'float',    required: false, unique: false },
    { name: 'currency',   type: 'string',   required: true,  unique: false, defaultValue: 'USD' },
    { name: 'signedAt',   type: 'datetime', required: false, unique: false },
    { name: 'expiresAt',  type: 'datetime', required: false, unique: false },
    { name: 'notes',      type: 'text',     required: false, unique: false },
  ],
},
```

### 3. Add to entityPatterns in parser.ts

Open `src/core/parser.ts`. Locate the `entityPatterns` object inside `extractEntities()` (around line 96).
Add your new entry in alphabetical order:

```typescript
const entityPatterns: Record<string, { keywords: string[]; fields: Field[] }> = {
  Client: { ... },
  Contract: {                          // <-- add here
    keywords: ['contract', 'contracts', 'agreement', 'agreements', 'nda'],
    fields: [ ... ],
  },
  Document: { ... },
  // ...
};
```

### 4. Add relationships (if applicable)

Check `relationshipMap` in `addRelationships()` (around line 259). If the new entity typically
belongs to another entity, add an entry:

```typescript
const relationshipMap: Record<string, string[]> = {
  Contract: ['Client'],   // Contract belongsTo Client
  Invoice: ['Client', 'Document'],
  // ...
};
```

Relationships are bidirectional — the target entity automatically gets a `hasMany` back-relation.

### 5. Verify with spec command

```bash
npx tsx bin/lfg.ts spec "a contract management app for law firms"
```

Confirm the output JSON includes `Contract` in `entities` with the expected fields.

### 6. Verify with dry-run build

```bash
npx tsx bin/lfg.ts build "contract management app" --dry-run
```

Confirm no errors and that contract-related files appear in the file list.

### 7. Verify with full build

```bash
npx tsx bin/lfg.ts build "contract management app" --skip-install -o /tmp/test-contract
ls /tmp/test-contract/src/app/\(dashboard\)/dashboard/contracts/
cat /tmp/test-contract/prisma/schema.prisma | grep -A 20 "model Contract"
```

## Common Mistakes

- Keyword must be lowercase — `extractEntities` lowercases the description before matching.
- Field `defaultValue` for string/text types must be a plain string (no quotes) — the template adds quotes in Prisma output.
- `enumValues` array entries must be lowercase strings — the schema template uppercases them for Prisma enums.
- Do not add `id`, `createdAt`, `updatedAt`, or `organizationId` to fields — these are added by the schema template automatically.
