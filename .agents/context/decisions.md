# Decisions

Durable decisions future agents should not reopen casually.

## Product

- Creed is a curation product, not a notes app, journal, memory feed, dashboard, or generic AI wrapper.
- Creed Open is the public v1 product: free, MIT licensed, self-hosted, single-owner, and Personal-only.
- Cloud, Shared Creeds, and the CLI remain private development products until separate launches.
- The hosted Cloud development build uses a temporary server-only email allowlist. Private mode must fail closed for authenticated product and agent access, disable billing, and keep public marketing pointed at the roadmap.
- MCP is the preferred agent connection path. Scoped HTTP bearer APIs remain a fallback.
- GitHub version control is manual push and pull, not automatic sync.
- Open AI features are BYOK through OpenRouter. Open never silently spends a platform-owned key or managed credits.
- Archiving a section parks its pending proposals with it. They leave live review surfaces and return on restore. Permanent delete is when those proposals are dropped.

## Architecture

- Open and Cloud are separate Next.js applications in the same monorepo.
- Common improvements belong in shared packages. Edition-specific routes and dependencies belong in `@creed/open` or `@creed/cloud`.
- Edition selection is compile-time composition through typed adapters, never a runtime environment flag.
- Shared packages and Open may not import Cloud.
- Stripe, hosted accounts, managed credits, feedback, and Shared collaboration are Cloud-only.
- Supabase remains the durable persistence layer for Open v1.
- Open and Cloud own separate migration histories in their respective `apps/*/supabase/migrations/` directories. Cloud deploys through the Supabase GitHub integration only after local verification. Open installations apply the Open-only history through setup or manual `db push`. Applied migrations are forward-only.
- `app/layout.tsx` stays static and does not load user state.
- Every `/api/app/*` route requires the edition auth adapter. Every `/api/creed/*` route verifies hashed bearer tokens. `/mcp` uses OAuth access tokens.
- Token columns store ciphertext only. Hash for lookup and decrypt only for authorised use.
- Open setup is a product surface owned by `@creed/open`. The guided installer and doctor remain hosting-platform neutral.
- Hosting presets may be added without forking shared application code. A generic persistence interface is deferred until a second real backend exists.

## Open owner access

- Open has no public login, signup, account menu, or recurring login screen.
- An 8-digit environment owner code claims the installation once per browser at `/enter`. `/setup` is only the incomplete-install checklist.
- Owner cookies are signed, HTTP-only, and invalidated by code rotation.
- A private singleton database record identifies the owner. Never discover the owner by scanning Auth users.
- Open fails closed when required environment values or schema migrations are missing.

## Interface

- Stale proposals disappear from inline review automatically. Activity retains their history; pending counts include only actionable proposals.
- Open keeps the New Creed dialog for name and picture but never shows a Personal/Shared selector.
- Open replaces the account menu button with a sidebar theme toggle.
- Open and Cloud follow the device colour scheme until the user chooses a theme. A saved Creed preference then takes precedence. Marketing first paint applies that choice with an inline blocking script in the static root layout, not `preinit` or `next/script` `beforeInteractive`.
- Open says `Saved locally` for drafts and `Saved to database` in green after database persistence.
- Open public calls to action say `View on GitHub`.
- Open and Cloud hide the CLI setup card until the CLI is rebuilt. Connections shows a full-width MCP card. Shared agent-card CLI attribution and status UI is retained for reuse.
- Documentation belongs to the standalone `apps/docs/` application. Open and Cloud do not duplicate or wrap its routes; shared packages retain only genuine interface primitives used by more than one surface.
- Ask answers render the same native editor blocks as the file (headings, lists, checklists, tables, callouts, code, dividers, inline marks). Ask, Agent, and Tab share `creedEditorMarkdownGuide`. Models must not wrap those blocks in fences unless the user asked for Markdown source.

## Release process

- `apps/open/package.json` is the canonical Open application version.
- Commits record work independently of releases. Open, Cloud, and CLI advance SemVer only for deliberate product releases; landing on `main` does not itself trigger a version bump or Git tag. The status site is not a versioned product.
- The clean public-history root is Open 1.0.0. Open git tags use `open-vX.Y.Z`, matching Cloud and CLI.
- Later history rewrites, deployment wipes, force-pushes, tags, and production deploys still need explicit authority.
- One-off plans and audits belong in gitignored `disposable/`; durable truth belongs in this context pack.

## Design

- Homepage YOUR uses the file editor's Orange mark: bold, then caps, then underline, then highlight. The mark stays inline so its pad does not grow the section line. Caps crossfade over an invisible lowercase box so YOUR cannot reserve width before that beat, and the line keeps the lowercase baseline. The underline is a bar under the glyph box because `text-decoration` does not paint through the caps overlay.
- Landing section titles reuse the file editor marks (`em`, `s`, `mark.creed-file-mark`, `#` chips, inline code) on one word each. How it works underlines and italicizes works. The FAQ heading is struck-through Dumb questions.
- Calm, premium, editorial, document-first.
- No em dashes in product copy or context docs.
- Reuse shared components and local patterns before inventing new UI.
- Mobile web must be genuinely good.
