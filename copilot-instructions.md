# Copilot Agent Instructions

> These instructions apply to every task in this workspace.
> Read and follow them before taking any action or making any decisions.

---

## 1. Core Principle — Code First, Docs Never (Unless Asked)

Your primary job is to **write clean, working code**. Do not create documentation
files on your own initiative. The following files must **never** be created unless
the user explicitly requests them by name or asks for documentation:

- README.md (unless the project has none at all)
- QUICK_START.md
- SOLUTION_SUMMARY.md
- TROUBLESHOOTING.md
- ARCHITECTURE_NOTES.md
- TESTING_CHECKLIST.md
- CHANGES_BEFORE_AFTER.md
- VISUAL_SUMMARY.md
- FILES_OVERVIEW.md
- INDEX.md
- COMPLETION_SUMMARY.md
- Any file whose sole purpose is to describe what you just did

If you feel the urge to create one of these, suppress it. Summarize in chat instead.

---

## 2. Communication — Use Chat, Not Files

When you want to explain something, do it **in the chat response**, not by creating
a new file. This includes:

- What you changed and why
- How to run or test something
- Warnings or trade-offs
- Next steps

A 5-line chat message is always better than a new markdown file.

---

## 3. When Documentation IS Allowed

Only create a markdown or text file if one of these is true:

| Condition | Example |
|---|---|
| User explicitly asks | "write a README for this project" |
| The deliverable itself is a doc | "create an API reference" |
| A config file is required to run the app | `.env.example`, `docker-compose.yml` |

When in doubt — **ask in chat, don't create a file**.

---

## 4. Planning Before Building

Before writing any code for a new feature or task:

1. State your plan in **2–4 bullet points** in chat
2. Ask if the approach looks right
3. Only proceed once confirmed (or if the task is trivially small)

This prevents large rewrites and wasted tokens.

---

## 5. File & Code Discipline

- **Edit existing files** rather than creating new ones wherever possible
- Do not duplicate logic — reuse what already exists in the codebase
- Keep functions small and single-purpose
- Do not add comments that just re-state what the code does (`// loop through array`)
- Prefer meaningful variable names over explanatory comments

---

## 6. Token Efficiency

- Be concise in chat. Short answers are better than long ones.
- Don't repeat what the user just said back to them
- Don't narrate what you're about to do — just do it
- Avoid filler phrases like "Certainly!", "Great question!", "Of course!"

---

## 7. Error Handling & Edge Cases

- Always handle errors — never silently swallow exceptions
- Validate inputs at the boundary (API handlers, form inputs, CLI args)
- Do not add `try/catch` everywhere internally — let errors bubble to a central handler

---

## 8. Testing

- Write tests only when asked, OR when the task is a pure utility/helper function
- Do not create a TESTING_CHECKLIST.md — describe test steps in chat if needed
- Prefer unit tests co-located with source files (e.g., `utils.test.ts` next to `utils.ts`)

---

## 9. When You Are Unsure

If a task is ambiguous:
- Ask **one clarifying question** in chat
- Do not guess and build the wrong thing
- Do not create placeholder files "to be filled later"

---

## 10. Summary Behavior Table

| Situation | Do This |
|---|---|
| Finished a task | Summarize in chat (3–5 lines max) |
| Need to explain architecture | Describe in chat |
| User asks "what changed?" | Answer in chat |
| Need to document a public API | Ask user first |
| Not sure what the user wants | Ask one question |
| Tempted to create a .md file | Don't. Use chat. |