---
name: create-plans
description: Create hierarchical project plans for LFG SaaS generation, optimized for solo agentic development. Incorporates Shape Up appetites, GTD capture, and Compound Engineering knowledge accumulation. Handles briefs, roadmaps, phase plans, and context handoffs. Produces Claude-executable plans with verification criteria, not enterprise documentation.
---

<essential_principles>

<principle name="solo_developer_plus_claude">
You are planning for ONE person (the user) and ONE implementer (Claude).
No teams. No stakeholders. No ceremonies. No coordination overhead.
The user is the visionary/product owner. Claude is the builder.

In LFG, the "product" is either:
1. The LFG tool itself (templates, parser, generator, scaffolder)
2. A generated SaaS app that LFG produces
</principle>

<principle name="plans_are_prompts">
PLAN.md is not a document that gets transformed into a prompt.
PLAN.md IS the prompt. It contains:
- Objective (what and why)
- Context (@file references)
- Tasks (type, files, action, verify, done, checkpoints)
- Verification (overall checks)
- Success criteria (measurable)
- Output (SUMMARY.md specification)

When planning a phase, you are writing the prompt that will execute it.
</principle>

<principle name="shape_up_appetites">
Every phase has a fixed time budget (appetite). When time's up, cut scope — never extend.

**Appetite sizes:**
- Small batch: 1-2 days (single template, single helper, parser tweak)
- Standard: 1 week (full entity pipeline, new auth flow, billing integration)
- Large: 2 weeks (new generation category, major refactor, new tech stack layer)

**Hill chart positions** (track per phase in ROADMAP.md):
- Uphill: figuring things out (unknown territory — what approach, what structure)
- Peak: problem understood, approach clear
- Downhill: executing known work (writing templates, wiring routes)

**Circuit breaker rule:** If a phase runs long, de-scope to meet the appetite. Cut the nice-to-haves. Ship what's solid. Log the rest to TO-DOS.md.

**SaaS generation phases** (the canonical LFG pipeline):
1. Schema — Prisma models + types
2. Auth — Auth.js v5 login/signup/session
3. Billing — Stripe checkout/webhook/portal
4. Dashboard — Entity CRUD pages + sidebar
5. API — REST routes + Server Actions
6. Landing — Marketing pages + pricing
7. Integration — Wire all pieces together

Each phase should get its own appetite. Don't cram Schema + Auth into one phase.
</principle>

<principle name="gtd_capture">
**Capture everything.** When ideas, bugs, enhancements, or TODOs surface during planning or execution, capture them immediately to `.planning/TO-DOS.md`. Never lose a thought to context limits.

**GTD flow for LFG work:**
1. **Capture** — anything goes into TO-DOS.md immediately
2. **Clarify** — is it actionable? Yes → next action. No → reference or someday/maybe.
3. **Organize** — tag by context: `[template]`, `[parser]`, `[generator]`, `[knowledge]`, `[billing]`, `[auth]`
4. **Reflect** — during roadmap review, promote items to phases or defer
5. **Engage** — pull from TO-DOS.md when planning the next phase

**TO-DOS.md format:**
```markdown
## Inbox (unprocessed)
- [ ] [raw capture]

## Next Actions
- [ ] [context:template] Add {{#if}} guard for optional billing in dashboard layout
- [ ] [context:parser] Detect "subscription" keyword → set billing: true

## Someday/Maybe
- [ ] Multi-tenant support (not now)
```

The `/lfg:add-todo` command appends to Inbox. Planning reviews clarify and organize.
</principle>

<principle name="compound_engineering">
**Every build makes the next faster. Knowledge compounds.**

After each significant phase completion, document what you learned:

```
knowledge/
├── patterns/       # Reusable Handlebars + TypeScript patterns
├── failures/       # What broke and why (prevent recurrence)
└── solutions/      # Concrete fixes for known problems
```

**When to document:**
- After fixing a Handlebars gotcha → `knowledge/solutions/`
- After discovering a clean entity pattern → `knowledge/patterns/`
- After a generation failure → `knowledge/failures/`

**SUMMARY.md must include a "Compound Engineering" section:**
```markdown
## Compound Engineering

### Patterns Discovered
- [pattern]: [when to use]

### Failures Encountered
- [failure]: [root cause] → logged to knowledge/failures/

### Knowledge Documented
- knowledge/patterns/[file].md — [what it captures]
```

This is non-optional. The knowledge base is how LFG gets smarter.
</principle>

<principle name="scope_control">
Plans must complete within ~50% of context usage to maintain consistent quality.

**The quality degradation curve:**
- 0-30% context: Peak quality (comprehensive, thorough, no anxiety)
- 30-50% context: Good quality (engaged, manageable pressure)
- 50-70% context: Degrading quality (efficiency mode, compression)
- 70%+ context: Poor quality (self-lobotomization, rushed work)

**Critical insight:** Claude doesn't degrade at 80% — it degrades at ~40-50% when it sees context mounting and enters "completion mode." By 80%, quality has already crashed.

**Solution:** Aggressive atomicity — split phases into many small, focused plans.

LFG-specific sizing:
- `01-01-PLAN.md` — Phase 1, Plan 1 (schema template only: 2-3 tasks)
- `01-02-PLAN.md` — Phase 1, Plan 2 (Prisma client + seed: 2-3 tasks)
- `01-03-PLAN.md` — Phase 1, Plan 3 (entity list page template: 2-3 tasks)
- `01-04-PLAN.md` — Phase 1, Plan 4 (entity detail page template: 2-3 tasks)

Each plan is independently executable, verifiable, and scoped to **2-3 tasks maximum**.

**Template tasks** ~15 min. **Parser tasks** ~30 min. **Full entity pipeline** ~60 min. Plan accordingly.

See: references/scope-estimation.md
</principle>

<principle name="human_checkpoints">
**Claude automates everything that has a CLI or API.** Checkpoints are for verification and decisions, not manual work.

**Checkpoint types:**
- `checkpoint:human-verify` — Human confirms Claude's automated work (visual checks, UI verification)
- `checkpoint:decision` — Human makes implementation choice (auth provider, architecture)

**Rarely needed:** `checkpoint:human-action` — Only for actions with no CLI/API (email verification links, account approvals requiring web login with 2FA)

**Critical rule:** If Claude CAN do it via CLI/API/tool, Claude MUST do it. Never ask human to:
- Run `npx tsx bin/lfg.ts build` commands (use Bash)
- Verify template output (use dry-run and read generated files)
- Write .env files (use Write tool)

**Protocol:** Claude automates work → reaches checkpoint:human-verify → presents what was done → waits for confirmation → resumes

See: references/checkpoints.md, references/cli-automation.md
</principle>

<principle name="deviation_rules">
Plans are guides, not straitjackets. Real development always involves discoveries.

**During execution, deviations are handled automatically via 5 embedded rules:**

1. **Auto-fix bugs** — Broken behavior → fix immediately, document in Summary
2. **Auto-add missing critical** — Security/correctness gaps → add immediately, document
3. **Auto-fix blockers** — Can't proceed → fix immediately, document
4. **Ask about architectural** — Major structural changes → stop and ask user
5. **Log enhancements** — Nice-to-haves → auto-log to TO-DOS.md (GTD capture), continue

**No user intervention needed for Rules 1-3, 5.** Only Rule 4 (architectural) requires user decision.

**All deviations documented in Summary** with: what was found, what rule applied, what was done, commit hash.

**Result:** Flow never breaks. Bugs get fixed. Scope stays controlled. Complete transparency.

See: workflows/execute-phase.md (deviation_rules section)
</principle>

<principle name="ship_fast_iterate_fast">
No enterprise process. No approval gates. No multi-week timelines.
Plan → Execute → Ship → Learn → Compound → Repeat.

**Milestone-driven:** Ship v1.0 → mark milestone → plan v1.1 → ship → repeat.
Milestones mark shipped versions and enable continuous iteration.

For LFG itself: milestones are working generator states. v1.0 = generates a complete SaaS app. v1.1 = adds multi-tenant support. Etc.
</principle>

<principle name="milestone_boundaries">
Milestones mark shipped versions (v1.0, v1.1, v2.0).

**Purpose:**
- Historical record in MILESTONES.md (what shipped when)
- Greenfield → Brownfield transition marker
- Git tags for releases
- Clear completion rituals

**Default approach:** Extend existing roadmap with new phases.
- v1.0 ships (phases 1-4) → add phases 5-6 for v1.1
- Continuous phase numbering (01-99)
- Milestone groupings keep roadmap organized

**Archive ONLY for:** Separate codebases or complete rewrites (rare).

See: references/milestone-management.md
</principle>

<principle name="anti_enterprise_patterns">
NEVER include in plans:
- Team structures, roles, RACI matrices
- Stakeholder management, alignment meetings
- Sprint ceremonies, standups, retros
- Multi-week estimates, resource allocation
- Change management, governance processes
- Documentation for documentation's sake

If it sounds like corporate PM theater, delete it.
</principle>

<principle name="context_awareness">
Monitor token usage via system warnings.

**At 25% remaining**: Mention context getting full
**At 15% remaining**: Pause, offer handoff
**At 10% remaining**: Auto-create handoff, stop

Never start large operations below 15% without user confirmation.
</principle>

<principle name="user_gates">
Never charge ahead at critical decision points. Use gates:
- **AskUserQuestion**: Structured choices (2-4 options)
- **Inline questions**: Simple confirmations
- **Decision gate loop**: "Ready, or ask more questions?"

Mandatory gates:
- Before writing PLAN.md (confirm breakdown)
- After low-confidence research
- On verification failures
- After phase completion with issues
- Before starting next phase with previous issues

See: references/user-gates.md
</principle>

<principle name="git_versioning">
All planning artifacts are version controlled. Commit outcomes, not process.

- Check for repo on invocation, offer to initialize
- Commit only at: initialization, phase completion, handoff
- Intermediate artifacts (PLAN.md, RESEARCH.md, FINDINGS.md) NOT committed separately
- Git log becomes project history

See: references/git-integration.md
</principle>

</essential_principles>

<context_scan>
**Run on every invocation** to understand current state:

```bash
# Check git status
git rev-parse --git-dir 2>/dev/null || echo "NO_GIT_REPO"

# Check for planning structure
ls -la .planning/ 2>/dev/null
ls -la .planning/phases/ 2>/dev/null

# Find any continue-here files
find . -name ".continue-here.md" -type f 2>/dev/null

# Check for existing artifacts
[ -f .planning/PROJECT.md ] && echo "PROJECT: exists"
[ -f .planning/REQUIREMENTS.md ] && echo "REQUIREMENTS: exists"
[ -f .planning/ROADMAP.md ] && echo "ROADMAP: exists"
[ -f .planning/STATE.md ] && echo "STATE: exists"
[ -f .planning/TO-DOS.md ] && echo "TO-DOS: exists"

# Check knowledge base
ls knowledge/ 2>/dev/null
```

**If NO_GIT_REPO detected:**
Inline question: "No git repo found. Initialize one? (Recommended for version control)"
If yes: `git init`

**Present findings before intake question.**
</context_scan>

<domain_expertise>
**LFG domain expertise lives in `skills/expertise/saas-generation/`**

Before creating roadmap or phase plans, load SaaS generation expertise.

<scan_domains>
```bash
ls skills/expertise/ 2>/dev/null
ls ~/.claude/skills/expertise/ 2>/dev/null
```

Check both the project-local skills directory and the global one.

**If no domain skills found:** Proceed without domain expertise (graceful degradation). The skill works fine without domain-specific context.
</scan_domains>

<inference_rules>
If user's request contains domain keywords, INFER the domain:

| Keywords | Domain Skill |
|----------|--------------|
| "SaaS", "Next.js", "Prisma", "Auth.js", "Stripe", "shadcn", "Resend" | expertise/saas-generation |
| "template", "Handlebars", "generator", "scaffolder", "LFG" | expertise/saas-generation |
| "entity", "CRUD", "dashboard", "billing", "landing page" | expertise/saas-generation |
| "macOS", "Mac app", "menu bar", "AppKit", "SwiftUI desktop" | expertise/macos-apps |
| "iPhone", "iOS", "iPad", "mobile app", "SwiftUI mobile" | expertise/iphone-apps |
| "Unity", "game", "C#", "3D game", "2D game" | expertise/unity-games |
| "Agent SDK", "Claude SDK", "agentic app" | expertise/with-agent-sdk |

For LFG projects, the domain is almost always `saas-generation`. Auto-load it unless working on non-SaaS tooling.
</inference_rules>

<load_domain>
When domain selected, use intelligent loading:

**Step 1: Read domain SKILL.md**
```bash
cat skills/expertise/saas-generation/SKILL.md 2>/dev/null || \
cat ~/.claude/skills/expertise/saas-generation/SKILL.md 2>/dev/null
```

This loads core principles and routing guidance (~5k tokens).

**Step 2: Determine what references are needed**

Domain SKILL.md contains a `<references_index>` section that maps planning contexts to specific references.

Example for saas-generation:
```markdown
<references_index>
**For schema/database phases:** references/prisma-patterns.md, references/zod-schemas.md
**For auth phases:** references/authjs-v5.md
**For billing phases:** references/stripe-integration.md
**For UI phases:** references/shadcn-components.md, references/tailwind-patterns.md
**Always useful:** references/handlebars-helpers.md, references/typescript-conventions.md
</references_index>
```

**Step 3: Load only relevant references**

Based on the phase being planned (from ROADMAP), load ONLY the references mentioned for that type of work.

**Context efficiency:**
- SKILL.md only: ~5k tokens
- SKILL.md + selective references: ~8-12k tokens
- All references (old approach): ~20-27k tokens

Announce: "Loaded saas-generation expertise ([X] references for [phase-type])."

**If domain skill not found:** Inform user and offer to proceed without domain expertise.
</load_domain>

<when_to_load>
Domain expertise should be loaded BEFORE:
- Creating roadmap (phases should be domain-appropriate for SaaS)
- Planning phases (tasks must reference correct templates, helpers, file paths)

Domain expertise is NOT needed for:
- Creating project vision (vision is domain-agnostic)
- Resuming from handoff (context already established)
- Transition between phases (just updating status)
</when_to_load>
</domain_expertise>

<intake>
Based on scan results, present context-aware options:

**If handoff found:**
```
Found handoff: .planning/phases/XX/.continue-here.md
[Summary of state from handoff]

1. Resume from handoff
2. Discard handoff, start fresh
3. Different action
```

**If planning structure exists:**
```
Project: [from PROJECT.md or directory]
Roadmap: [X phases defined]
Current: [phase status from STATE.md]
Hill position: [uphill/peak/downhill]
TO-DOS: [N items captured]

What would you like to do?
1. Plan next phase
2. Execute current phase
3. Create handoff (stopping for now)
4. View/update roadmap
5. Review TO-DOS.md
6. Something else
```

**If no planning structure:**
```
No planning structure found.

What would you like to do?
1. Start new project (create PROJECT.md + ROADMAP.md)
2. Create roadmap from existing description
3. Jump straight to phase planning
4. Get guidance on approach
```

**Wait for response before proceeding.**
</intake>

<routing>
| Response | Workflow |
|----------|----------|
| "brief", "new project", "start", 1 (no structure) | `workflows/create-project.md` |
| "roadmap", "phases", 2 (no structure) | `workflows/create-roadmap.md` |
| "phase", "plan phase", "next phase", 1 (has structure) | `workflows/plan-phase.md` |
| "chunk", "next tasks", "what's next" | `workflows/plan-chunk.md` |
| "execute", "run", "do it", "build it", 2 (has structure) | **EXIT SKILL** → Use `/lfg:execute-phase` command |
| "research", "investigate", "unknowns" | `workflows/research-phase.md` |
| "handoff", "pack up", "stopping", 3 (has structure) | `workflows/handoff.md` |
| "resume", "continue", 1 (has handoff) | `workflows/resume.md` |
| "transition", "complete", "done", "next" | `workflows/transition.md` |
| "milestone", "ship", "v1.0", "release" | `workflows/complete-milestone.md` |
| "todo", "capture", "add todo" | Append to `.planning/TO-DOS.md` Inbox |
| "guidance", "help", 4 | `workflows/get-guidance.md` |

**Critical:** Plan execution should NOT invoke this skill. Use `/lfg:execute-phase` for context efficiency (skill loads ~20k tokens, execute-phase loads ~5-7k).

**After reading the workflow, follow it exactly.**
</routing>

<hierarchy>
The LFG planning hierarchy (each level builds on previous):

```
PROJECT.md        → Living project context (vision, decisions, constraints)
    ↓
REQUIREMENTS.md   → REQ-IDs with phase traceability
    ↓
ROADMAP.md        → Phases with appetites, hill positions, circuit breakers
    ↓
STATE.md          → Current position, decisions, blockers
    ↓
TO-DOS.md         → GTD capture (inbox → next actions → someday/maybe)
    ↓
PLAN.md           → THE PROMPT (Claude executes this)
    ↓
SUMMARY.md        → Outcome (existence = phase complete) + Compound Engineering section
```

**Rules:**
- Roadmap requires Project context (or prompts to create one)
- Phase plan requires Roadmap (knows phase scope + appetite)
- PLAN.md IS the execution prompt
- SUMMARY.md existence marks phase complete
- SUMMARY.md MUST include Compound Engineering section
- Each level can look UP for context
</hierarchy>

<output_structure>
All planning artifacts go in `.planning/`:

```
.planning/
├── PROJECT.md              # Living project context (vision, decisions, constraints)
├── REQUIREMENTS.md         # REQ-IDs with phase traceability
├── ROADMAP.md              # Phases with appetites, hill positions, circuit breakers
├── STATE.md                # Current position, decisions, blockers
├── TO-DOS.md               # GTD capture (from /lfg:add-todo or inline capture)
└── phases/
    ├── 01-schema/
    │   ├── 01-01-PLAN.md       # Plan 1: Prisma schema template
    │   ├── 01-01-SUMMARY.md    # Outcome + Compound Engineering section
    │   ├── 01-02-PLAN.md       # Plan 2: Zod types + parser entities
    │   └── 01-02-SUMMARY.md
    ├── 02-auth/
    │   ├── 02-01-PLAN.md       # Auth.js v5 pages + API routes
    │   ├── 02-01-SUMMARY.md
    │   └── .continue-here-02-01.md  # Handoff (temporary, if needed)
    ├── 03-billing/
    │   └── ...
    └── 04-dashboard/
        └── ...
```

**PLAN.md frontmatter must include `must_haves`:**
```yaml
---
phase: 01-schema
plan: "01-01"
appetite: small  # small | standard | large
hill_position: downhill  # uphill | peak | downhill
must_haves:
  truths:
    - "User can sign up and log in"
    - "Dashboard loads for authenticated user"
    - "Entity CRUD works end-to-end"
  artifacts:
    - path: "templates/database/schema.prisma.hbs"
      provides: "Prisma schema with all entities"
      min_lines: 40
  key_links:
    - from: "src/core/generator.ts"
      to: "templates/database/schema.prisma.hbs"
      via: "render() call in generateDatabase()"
requirements: [SCHEMA-01, SCHEMA-02]
---
```

**Naming convention:**
- Plans: `{phase}-{plan}-PLAN.md` (e.g., 01-02-PLAN.md)
- Summaries: `{phase}-{plan}-SUMMARY.md` (e.g., 01-02-SUMMARY.md)
- Phase folders: `{phase}-{name}/` (e.g., 01-schema/)

Files sort chronologically. Related artifacts (plan + summary) are adjacent.
</output_structure>

<plan_format>
Every PLAN.md must produce clean TypeScript — no `any` types, no Handlebars triple-brace issues.

**LFG-specific verification commands:**
```bash
# Verify spec parsing (parser changes)
npx tsx bin/lfg.ts spec "test SaaS with users and projects"

# Verify generation (template changes) — dry-run first
npx tsx bin/lfg.ts build "test SaaS with users and projects" --dry-run

# Full generation test (skip install for speed)
npx tsx bin/lfg.ts build "test SaaS with users and projects" \
  --skip-install -o /tmp/test-output

# Type-check generated output
cd /tmp/test-output && npx tsc --noEmit 2>&1 | head -30
```

**Every plan that touches templates or generator MUST include a dry-run verification task.**
</plan_format>

<compound_engineering_integration>
After each SUMMARY.md is written, check if new knowledge should be captured:

```bash
# Check what already exists
ls knowledge/patterns/ 2>/dev/null
ls knowledge/solutions/ 2>/dev/null
ls knowledge/failures/ 2>/dev/null
```

**When to create knowledge documents:**
- New Handlebars helper pattern discovered → `knowledge/patterns/`
- Prisma syntax quirk fixed → `knowledge/solutions/`
- Template rendering failure debugged → `knowledge/failures/`
- Entity detection keyword set refined → `knowledge/patterns/`

**Format for knowledge documents:**
```markdown
# [Pattern/Solution/Failure Name]

## Context
When does this apply?

## Problem
What goes wrong without this knowledge?

## Solution
The correct approach.

## Example
Concrete code example.

## Discovery
Phase/plan where this was first encountered.
```

Reference existing knowledge files before writing new ones — check for duplicates.
</compound_engineering_integration>

<reference_index>
All in `references/`:

**Structure:** directory-structure.md, hierarchy-rules.md
**Formats:** handoff-format.md, plan-format.md
**Patterns:** context-scanning.md, context-management.md
**Planning:** scope-estimation.md, checkpoints.md, milestone-management.md
**Process:** user-gates.md, git-integration.md, research-pitfalls.md
**Domain:** domain-expertise.md (guide for creating context-efficient domain skills)
</reference_index>

<templates_index>
All in `templates/`:

| Template | Purpose |
|----------|---------|
| project.md | Living project context (vision, decisions, constraints) |
| requirements.md | REQ-ID traceability table |
| roadmap.md | Phase structure with appetites, hill positions, circuit breakers |
| plan.md | Executable phase prompt with must_haves frontmatter (PLAN.md) |
| summary.md | Phase outcome with Compound Engineering section (SUMMARY.md) |
| state.md | Current position tracker (STATE.md) |
| todos.md | GTD capture file (TO-DOS.md) |
| research-prompt.md | Research prompt (RESEARCH.md) |
| milestone.md | Milestone entry for MILESTONES.md |
| issues.md | Deferred enhancements log (ISSUES.md) |
| continue-here.md | Context handoff format |
</templates_index>

<workflows_index>
All in `workflows/`:

| Workflow | Purpose |
|----------|---------|
| create-project.md | Create PROJECT.md + initial ROADMAP structure |
| create-roadmap.md | Define phases with appetites from project description |
| plan-phase.md | Create executable phase prompt with must_haves |
| execute-phase.md | Run phase prompt, create SUMMARY + knowledge docs |
| research-phase.md | Create and run research prompt |
| plan-chunk.md | Plan immediate next tasks |
| transition.md | Mark phase complete, update hill position, advance |
| complete-milestone.md | Mark shipped version, create milestone entry |
| handoff.md | Create context handoff for pausing |
| resume.md | Load handoff, restore context |
| get-guidance.md | Help decide planning approach |
</workflows_index>

<success_criteria>
Planning skill succeeds when:
- Context scan runs before intake
- Appropriate workflow selected based on state
- Domain expertise loaded (saas-generation by default for LFG)
- PLAN.md IS the executable prompt (not separate)
- PLAN.md frontmatter includes must_haves with truths, artifacts, key_links
- PLAN.md includes appetite and hill_position
- ROADMAP.md tracks appetites and hill chart positions per phase
- Circuit breaker rule applied when phases run long (de-scope, don't extend)
- TO-DOS.md captures all GTD items (inbox → organized)
- Hierarchy maintained (project → requirements → roadmap → plan)
- SUMMARY.md includes Compound Engineering section
- New knowledge documented in knowledge/ after significant phases
- Handoffs preserve full context for resumption
- Context limits respected (auto-handoff at 10%)
- Deviations handled automatically per embedded rules
- All work (planned and discovered) fully documented
- Plan execution uses /lfg:execute-phase command (not skill invocation)
</success_criteria>
