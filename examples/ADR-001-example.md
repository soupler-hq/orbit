# ADR-001: Use Next.js App Router over Pages Router

**Status**: Accepted
**Date**: 2026-01-15
**Deciders**: @sunny (CTO), architect agent
**Review Trigger**: If RSC stability degrades or streaming requirements change

---

## Context

We are building Soupler HQ, an internal operations platform. It requires:
- Server-side data fetching with low latency
- Rich, interactive UI (kanban boards, real-time updates)
- Admin-only access (no public SEO requirements)
- Tight integration with a NestJS API

We are choosing between Next.js App Router (React Server Components) and the legacy Pages Router.

---

## Decision

**We will use the Next.js 14 App Router with React Server Components.**

---

## Alternatives Considered

### Option A: Next.js App Router (chosen)
**Pros:**
- Server Components reduce client JS bundle (dashboard loads faster)
- Streaming with Suspense for progressive rendering
- Layouts eliminate prop drilling for shared state (auth, navigation)
- Native data fetching in Server Components (no useEffect for initial data)
- Future-proof: Vercel actively developing this path

**Cons:**
- RSC is still maturing (some libraries not yet compatible)
- Mental model shift required for team
- `use client` boundary management requires discipline

### Option B: Next.js Pages Router (rejected)
**Pros:**
- Battle-tested, stable, well-documented
- All libraries compatible
- Team already familiar

**Cons:**
- `getServerSideProps` is verbose and co-location is poor
- No streaming (full page TTFB)
- Being deprecated: new features only in App Router
- We'd be building on a sunset path

### Option C: Remix (rejected)
**Pros:**
- Excellent data loading/mutation model (loaders + actions)
- Progressive enhancement built-in

**Cons:**
- Smaller ecosystem, less library support
- Team has no Remix experience — context cost too high
- Railway deployment simpler for Next.js (known patterns)

---

## Consequences

**Positive:**
- Dashboard renders fast (server-fetched data, no loading spinners for initial load)
- Bundle size reduced ~40% (most UI components stay server-side)
- Clean layout patterns (root layout → dashboard layout → page)

**Negative:**
- Libraries like `react-beautiful-dnd` require `use client` wrappers (additional work)
- New hire onboarding requires RSC mental model training
- Some debugging is harder (RSC errors can be cryptic)

**Mitigations:**
- Create a `components/client/` directory convention for all client components
- Add RSC debugging guide to team wiki
- Pin Next.js version, track release notes for breaking changes

---

## Review Criteria
Revisit this decision if:
- RSC introduces a breaking change that affects >20% of our components
- A better framework emerges for admin dashboards (unlikely in 18 months)
- Server Components streaming performance doesn't meet the <200ms TTFB target
