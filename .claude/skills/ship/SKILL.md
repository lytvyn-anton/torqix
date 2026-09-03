---
name: ship
description: Run this project's branch → commit → PR → CI → merge workflow. Use whenever a chunk of work (a task or a few related tasks from the Notion tracker) is ready to land on main. Never commit directly to main — always go through this flow instead.
---

# ship

This project never commits straight to `main`. Every change lands through a PR gated by CI
(lint + format check + unit tests). This skill runs that flow end to end.

## Steps

1. **Check the current branch.** If on `main`, create a new branch:
   - `phase-<n>/<short-description>` for work tied to a PLAN.md phase
   - `fix/<short-description>` for anything outside a phase
     If already on a feature branch with relevant uncommitted work, reuse it.

2. **Run checks locally before committing:**
   - `npm run lint`
   - `npm run format:check` (if it fails, run `npm run format` and review the diff)
   - `npm test`
     Fix any failures before moving on — don't push broken code and rely on CI to catch it.

3. **Commit in logical chunks**, not one giant commit for everything that changed. Write
   commit messages that explain _why_, ending with:

   ```
   Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
   ```

4. **Push** the branch with `git push -u origin <branch>` (first push) or `git push` (subsequent).

5. **Open a PR** with `gh pr create`, using a Summary + Test plan body, ending with:

   ```
   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   ```

6. **Wait for CI.** Poll with `gh pr checks <number>` until the `CI` check reports success or
   failure — don't guess at the result.
   - If it fails: read the failing job's log (`gh run view <run-id> --log-failed`), fix the
     issue, commit, push, and wait again. Never bypass the check.

7. **Merge once CI is green.** `main` has branch protection requiring the CI check but no
   required review (solo project — there's no second account to approve). Merge with
   `gh pr merge <number> --squash --delete-branch`, then locally:
   `git checkout main && git pull && git branch -d <branch>`.

8. **Update tracking.** Mark the corresponding task(s) `Done` in the Notion tracker, and check
   off the phase in PLAN.md if this was the last task in that phase.

## Notes

- If the user asked for review before merging, stop after step 6 and wait instead of merging.
- Don't force-push to fix a failing check — push a new commit. Force-push only if the user
  explicitly asks for it.
