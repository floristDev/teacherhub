<skill>
  <name>saas-generation</name>
  <version>1.0.0</version>
  <description>
    Domain expertise router for LFG SaaS generation. Loaded by the LFG planner agent when
    creating plans for any phase of SaaS development. Points to the correct reference based
    on what is being built or debugged.
  </description>

  <purpose>
    LFG generates complete SaaS applications from natural language. The generator, parser,
    and templates each have distinct failure modes and patterns. This skill routes agents to
    the right reference so they apply correct patterns the first time — avoiding the known
    gotchas that corrupt generated output.
  </purpose>

  <tech_stack>
    <lfg_tool>TypeScript, Commander.js, Handlebars, Zod</lfg_tool>
    <generated_app>Next.js 14+ App Router, Prisma + PostgreSQL, Auth.js v5, Stripe, Tailwind CSS + shadcn/ui, Resend</generated_app>
  </tech_stack>

  <references_index>
    <!-- Use this table to locate the right reference for any phase of work. -->

    <phase name="database-schema">
      <when>Designing Prisma models, adding fields, writing migrations, seeding data, setting up the db client</when>
      <refs>references/prisma-patterns.md, references/multi-tenancy.md</refs>
    </phase>

    <phase name="multi-tenancy">
      <when>Adding organizationId scoping, enforcing tenant isolation in queries or server actions, verifying ownership</when>
      <refs>references/multi-tenancy.md</refs>
    </phase>

    <phase name="auth">
      <when>Configuring Auth.js v5, adding providers, threading session data, writing middleware, password hashing, role checks</when>
      <refs>references/authjs-v5.md</refs>
    </phase>

    <phase name="billing">
      <when>Stripe checkout flow, webhook handling, subscription sync, Customer Portal, plan gating</when>
      <refs>references/stripe-integration.md</refs>
    </phase>

    <phase name="ui-components">
      <when>Building or editing shadcn/ui components, Tailwind conventions, form layout, data tables, dialogs, sidebar/header</when>
      <refs>references/shadcn-ui-patterns.md, references/server-actions.md</refs>
    </phase>

    <phase name="server-actions">
      <when>Writing Next.js Server Actions, form submission, revalidation, optimistic UI, auth checks inside actions</when>
      <refs>references/server-actions.md, references/nextjs-app-router.md</refs>
    </phase>

    <phase name="api-routes">
      <when>Adding or editing App Router API routes (route.ts files), REST conventions, error responses, auth middleware</when>
      <refs>references/nextjs-app-router.md, references/server-actions.md</refs>
    </phase>

    <phase name="template-work">
      <when>Creating or editing .hbs Handlebars templates, hitting parse errors, debugging helper output</when>
      <refs>references/handlebars-gotchas.md, references/entity-generation.md</refs>
    </phase>

    <phase name="entity-generation">
      <when>Generating CRUD pages, API routes, and server actions for a new entity type</when>
      <refs>references/entity-generation.md, references/prisma-patterns.md, references/server-actions.md</refs>
    </phase>

    <phase name="parser-work">
      <when>Adding new entity patterns to parser.ts, improving keyword extraction, adjusting field defaults</when>
      <refs>workflows/add-entity-pattern.md, workflows/improve-parser.md</refs>
    </phase>

    <phase name="template-registration">
      <when>Wiring a new .hbs template into generator.ts so it is emitted during build</when>
      <refs>workflows/add-template.md</refs>
    </phase>

    <phase name="template-debugging">
      <when>Template produces wrong output, parse errors, missing variables, broken JSX</when>
      <refs>workflows/debug-template.md, references/handlebars-gotchas.md</refs>
    </phase>
  </references_index>

  <critical_rules>
    <!-- These rules apply across all phases. Violating them produces broken generated output. -->

    <rule id="no-triple-brace-in-jsx">
      Never place a Handlebars helper immediately before a JSX closing brace.
      WRONG:  {create{{pascalCase entity.slug}}}
      CORRECT: {create{{pascalCase entity.slug}} }
      Full details: references/handlebars-gotchas.md
    </rule>

    <rule id="prisma-string-defaults-quoted">
      String field defaults in Prisma schema must be double-quoted.
      WRONG:  currency String @default(USD)
      CORRECT: currency String @default("USD")
      Full details: references/handlebars-gotchas.md
    </rule>

    <rule id="organization-id-from-session">
      Never trust organizationId from request body or user input.
      Always derive it from the authenticated session.
      Full details: references/multi-tenancy.md
    </rule>

    <rule id="auth-v5-not-v4">
      Auth.js v5 API is incompatible with v4. Do not use v4 patterns.
      Full details: references/authjs-v5.md
    </rule>

    <rule id="webhook-200-always">
      Stripe webhook handlers must return HTTP 200 even on internal errors.
      Returning non-200 causes Stripe to retry indefinitely.
      Full details: references/stripe-integration.md
    </rule>

    <rule id="no-any-types">
      All generated TypeScript must have zero `any` types.
      Use proper Prisma-generated types and Zod-inferred types.
    </rule>

    <rule id="server-components-by-default">
      All Next.js pages and layouts are Server Components by default.
      Add "use client" only when the component needs browser APIs, state, or event handlers.
      Full details: references/nextjs-app-router.md
    </rule>
  </critical_rules>

  <lfg_conventions>
    <convention name="template-context">
      Global templates receive `{ spec, timestamp, version }` as context.
      Entity templates receive `{ spec, entity, timestamp, version }` as context.
      The entity loop in generator.ts adds `entity` to entityCtx via spread.
    </convention>

    <convention name="entity-paths">
      Entity pages live at: src/app/(dashboard)/dashboard/{entity.slug}s/
      Entity API routes live at: src/app/api/v1/{entity.slug}s/
      Entity actions live at: src/app/(dashboard)/dashboard/{entity.slug}s/actions.ts
    </convention>

    <convention name="helpers">
      Available Handlebars helpers: eq, neq, lowercase, uppercase, capitalize,
      camelCase, pascalCase, kebabCase, pluralize, prismaType, tsType, inputType,
      json, jsonInline, join, length, concat, substring, and, or, not, fileHeader,
      ifCond, first, last, includes, now
    </convention>

    <convention name="type-mappings">
      Field type → Prisma type: string→String, text→String, int→Int,
      float→Float, boolean→Boolean, datetime→DateTime, enum→String, json→Json
      Field type → TS type: string/text→string, int/float→number,
      boolean→boolean, datetime→Date, json→Record[string,unknown]
      Field type → HTML input: string→text, text→textarea, int/float→number,
      boolean→checkbox, datetime→datetime-local, enum→select
    </convention>

    <convention name="generated-file-header">
      Every generated file starts with: {{fileHeader}}
      This emits "// Generated by LFG..." with a timestamp.
    </convention>
  </lfg_conventions>

  <quick_commands>
    <!-- Run these to test changes without full build overhead -->
    <cmd>npx tsx bin/lfg.ts spec "description"</cmd>
    <cmd>npx tsx bin/lfg.ts build "description" --dry-run</cmd>
    <cmd>npx tsx bin/lfg.ts build "description" --skip-install -o /tmp/test-output</cmd>
  </quick_commands>
</skill>
