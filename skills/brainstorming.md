# SKILL: Brainstorming & Spec Extraction
> Never start building until you know what you're building and why

## ACTIVATION
Auto-loaded at the start of any new project, milestone, or major feature.

## THE BRAINSTORM PROTOCOL

### Phase 1: Intent Extraction (max 5 questions)
Ask only the questions where the answer changes the plan significantly.
Do NOT ask questions whose answer can be reasonably assumed.
Do NOT ask more than 5 questions at once — prioritize ruthlessly.

**Always ask about**:
- Who are the users, and what is their core job-to-be-done?
- What is the definition of "this worked" for v1?
- What are the hard constraints? (tech stack, timeline, budget, compliance)
- What already exists that we must integrate with or not duplicate?

**Ask if ambiguous**:
- What is the scale expectation? (users, data volume, request rate)
- Is there a preference between build vs buy for any component?
- What is the non-negotiable quality bar? (uptime, latency, security level)

### Phase 2: Assumption Surfacing
Before presenting any design, state assumptions explicitly:
```
Assumptions made (please correct if wrong):
- Users are authenticated employees, not anonymous public users
- The system must integrate with the existing Postgres database
- Mobile-first is not required for v1
- The team is comfortable with TypeScript and Node.js
```

### Phase 3: Design Presentation (chunked)
Present design in sections small enough to review and approve independently:
1. **System overview** (one paragraph + component list) → get approval
2. **Data model** (key entities and relationships) → get approval
3. **API surface** (key endpoints and flows) → get approval
4. **Phase breakdown** (milestones and what each delivers) → get approval

Never present everything at once. Approval at each stage prevents expensive rework.

### Phase 4: Spec Document
Once design is approved, produce:

```markdown
# Project Spec: {Name}

## Vision
One paragraph: what is this, who uses it, why does it matter?

## Success Criteria (v1)
- [ ] {Measurable criterion 1}
- [ ] {Measurable criterion 2}
- [ ] {Measurable criterion 3}

## Users & Use Cases
### Primary User: {Role}
1. {Core use case 1}
2. {Core use case 2}

## Hard Constraints
- Tech: {stack constraints}
- Timeline: {deadline if any}
- Compliance: {GDPR, HIPAA, SOC2, etc.}
- Integration: {must connect to X}

## Out of Scope (v1)
- {Feature A} — reason
- {Feature B} — reason

## Open Questions
- {Question 1} — owner, deadline for decision
```

## SOCRATIC DESIGN PRINCIPLES
- Explore alternatives before committing: "We could do X or Y — here's the trade-off..."
- Surface hidden complexity: "This seems simple, but consider what happens when..."
- Challenge scope creep: "Is {feature} critical for v1 to deliver value, or is it v2?"
- Validate assumptions out loud: "I'm assuming X because Y — is that right?"

## WHAT GOOD BRAINSTORMING PRODUCES
A spec so clear that:
- Any engineer can implement from it without guessing
- Stakeholders can validate it without reading code
- New team members understand the vision in one read
