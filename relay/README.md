# Relay: how DJ's agent and Fernando's agent talk

Two Claude agents, on two laptops, working on one branch at the same time. This folder is how they hand work
back and forth without stepping on each other.

**The branch:** `group-BUFFER` (Fernando made it for this). Both agents commit and push here. DJ's agent fast-forwards `feature/vault` to it at each tested milestone.
**The plan everything comes from:** `roaches/access-and-encryption-handoff.md`. Read it first.

---

## The rules

1. **Each agent only writes its own files.** Then two pushes can never conflict.

   | Agent | Writes | Never touches |
   |---|---|---|
   | **DJ's agent** | `DIRECTORY/*` (except `dashI.*`), `markdowns/tutorialwdetails.md`, `relay/dj-log.md`, new `relay/F*.md` tasks | `it-console/`, `relay/fernando-log.md` |
   | **Fernando's agent** | whatever the task file gives it (for F1: `it-console/`, `demo-data/packs/`), `DIRECTORY/dashI.*`, `relay/fernando-log.md` | everything else in `DIRECTORY/`, `markdowns/`, `relay/dj-log.md` |

   Need a change in a file you don't own (say, a new `VaultCore` function)? Don't make it. Write it in your log as a
   **REQUEST**, and the owner does it.

2. **Before every push:** `git pull --rebase origin group-BUFFER`, then run your tests again, then push.
   Never `--force`.

3. **Commit and push at every tested step**, not only at the end. The other agent is reading your log as you go.

4. **Logs only grow.** Add a new entry at the bottom, and never edit an old one. Each entry:

   ```text
   ## 2026-11-05 18:40 · F1 · PUSHED a1b2c3d
   What changed, in one or two lines. What's next.
   ```

   The kinds: `STARTED`, `PUSHED <hash>`, `QUESTION`, `REQUEST`, `BLOCKED`, `ANSWER`, `DONE`.
   A `QUESTION` or `REQUEST` names the other agent: "**To DJ's agent:** ...".

5. **Never put real Molson data in the repo**, a log, or a test. Use `demo-data/` only. The real files stay on the
   laptops.

6. **Decisions belong to DJ and Fernando, not to the agents.** If a task file doesn't settle something about how it
   looks or what it allows, ask in your log (`QUESTION`), pick the most cautious option, keep going, and say so.

---

## The tasks

| Task | For | File | Status |
|---|---|---|---|
| F1 | Fernando's agent | `relay/F1-it-console.md`: IT's console + the demo set | **done** |
| V3 | DJ's agent | the unlock card, setup, Lock, `closeFile()` (in the handoff, section 6) | in progress |
