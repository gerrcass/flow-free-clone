---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, use /code-review to review the work.

Work on a feature branch named `feat/<issue>-<slug>`, never directly on the main branch. Reference the ticket in the branch name, commit messages, and pull request.

Once done and committed, push the branch and open a pull request against the main branch (use /pr for the body). Comment the PR link on the ticket, swap its `ready-for-agent` label for `ready-for-human`, and leave the ticket open; it closes on merge. Ticket operations follow `docs/agents/issue-tracker.md`.
