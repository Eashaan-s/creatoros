import { markdownToHtml } from "@/lib/utils";

export type StarterTemplate = {
  id: string;
  title: string;
  description: string;
  category: string;
  /** Optional Writer deep-link as alternate path */
  writerType?: string;
  markdown: string;
};

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: "resume",
    title: "Resume",
    description: "Clean professional resume scaffold — fill sections, then polish in Editor.",
    category: "Career",
    markdown: `# Your Name

**Role** · City · email@example.com · linkedin.com/in/you

## Summary
Two to three sentences on your strengths and the roles you target.

## Experience
### Company — Title
*Month Year – Present*
- Impact bullet with metric
- Second achievement
- Third achievement

### Previous Company — Title
*Month Year – Month Year*
- Impact bullet

## Education
**University** — Degree, Year

## Skills
Skill one · Skill two · Skill three
`,
  },
  {
    id: "proposal",
    title: "Project proposal",
    description: "Client-ready proposal outline with scope, timeline, and investment.",
    category: "Business",
    markdown: `# Project proposal

**Prepared for:** Client name  
**Date:**  

## Overview
What we will deliver and why it matters.

## Goals
1. Primary outcome
2. Secondary outcome

## Scope
### In scope
- Item

### Out of scope
- Item

## Approach
Phases and how we work together.

## Timeline
| Phase | Duration |
| --- | --- |
| Discovery | 1 week |
| Build | 3 weeks |
| Launch | 1 week |

## Investment
Pricing summary and assumptions.

## Next steps
1. Approve scope
2. Kickoff
`,
  },
  {
    id: "prd",
    title: "Product requirements (PRD)",
    description: "Lightweight PRD for features — problem, users, requirements, success metrics.",
    category: "Product",
    markdown: `# PRD: Feature name

**Owner:**  
**Status:** Draft  

## Problem
Who feels the pain and what breaks today.

## Goals
- User goal
- Business goal

## Non-goals
- Explicitly out of this release

## Users & scenarios
- Persona — key job to be done

## Requirements
### Must have
- Requirement

### Nice to have
- Requirement

## Success metrics
- Metric and target

## Open questions
- Question
`,
  },
  {
    id: "newsletter",
    title: "Newsletter",
    description: "Issue structure with hook, sections, and a clear CTA.",
    category: "Content",
    writerType: "newsletter",
    markdown: `# Newsletter title

Hey {{audience}},

**Hook** — one sharp line on why this issue matters.

## Section one
Short paragraph.

## Section two
Short paragraph.

## Worth sharing
- Link or takeaway

## CTA
What you want readers to do next.

— Your name
`,
  },
  {
    id: "case-study",
    title: "Case study",
    description: "Challenge → approach → results narrative for portfolios and sales.",
    category: "Content",
    markdown: `# Case study: Customer name

## Snapshot
Industry · Company size · Outcome in one line

## Challenge
What was broken or missing.

## Approach
How you solved it — process and tools.

## Results
- Metric 1
- Metric 2
- Quote (optional)

## Lessons
What you would repeat or change.
`,
  },
  {
    id: "meeting-notes",
    title: "Meeting notes",
    description: "Agenda, decisions, and action items — ready to paste after a call.",
    category: "Ops",
    markdown: `# Meeting notes

**Date:**  
**Attendees:**  

## Agenda
1. Topic

## Discussion
- Note

## Decisions
- Decision

## Action items
| Owner | Task | Due |
| --- | --- | --- |
| Name | Task | Date |

## Next meeting
Date / focus
`,
  },
];

export function templateToHtml(markdown: string) {
  return markdownToHtml(markdown);
}
