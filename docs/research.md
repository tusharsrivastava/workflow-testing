Great — we’ll research existing GitHub Actions we can reuse, map them to our workflows, and provide starter example workflows plus a list of custom pieces we’ll need to write. Below is a concise, team-style design doc (using **we**) that follows our agreed template.

# Overview and general idea

We will inventory existing Marketplace actions that cover branch creation/deletion, backporting, auto-merge, labeling, reviewer assignment, branch sync, tag/version bumping and PR creation. Where robust, well-maintained actions exist we’ll adopt them; where gaps remain we’ll implement small, focused custom actions/workflows (JavaScript/TypeScript or composite actions) to keep ownership and enforce our conventions (milestone-triggered release branches, FROZEN_RELEASE guard, rebase sync strategy, and retire flow).

# Existing actions — what we found and how they map to requirements

## Branch management (create/delete)

* **Create Branch** — `peterjgrainger/action-create-branch` / Marketplace *Create Branch* — creates branches from a reference (tag/branch/sha). Good fit to create `release/x.y` from `dev`. ([GitHub][1])
* **Create Branch from Tag** — `lablnet/create-branch-from-tag` if we need branch-from-tag semantics (hotfix from deployed tag). ([GitHub][2])
* **Delete Multiple Branches** — actions that delete branches (bulk delete) to implement retire flows. Useful for cleaning up `release/x.y` once retired. ([GitHub][3])

## Pull request management (labeling, reviewers, auto-merge, comments)

* **Labeler** — official `actions/labeler` to add labels based on file globs. Good for many labeling rules. Note: it labels by changed files, not by PR author metadata. ([GitHub][4])
* **Backport / Backport Action** — several backport actions exist (e.g., `korthout/backport-action`, other “backport” marketplace actions). They create cherry-pick PRs to target branches (we can trigger by applying a `backport` label). Good for our automated backporting flows. ([GitHub][5])
* **Auto-merge** — `pascalgn/automerge-action` or other automerge actions let us merge PRs that satisfy checks and have a label (e.g., `automerge`). Use with caution; ensure repo permissions and branch protections are respected. ([GitHub][6])
* **Review / Assign** — actions to set reviewers/assignees (e.g., `hkusu/review-assign-action`, `abinoda/assignee-to-reviewer-action`) and `CODEOWNERS` for deterministic reviewer assignment. Use `review-assign` and/or `github-script` when we need conditional assignment logic. ([GitHub][7])
* **Create Pull Request** — `peter-evans/create-pull-request` is a stable action to open/update PRs from within a workflow (useful for sync, release branch creation confirmation, or automated backports). ([GitHub][8])

## Branch synchronization & repo sync

* **Repo Sync** — `repo-sync/repo-sync` provides a template for keeping branches/ repos in sync (creates PRs to merge default branch changes into target repo/branch). Works on schedule or triggered runs and can be adapted to our rebase/PR strategy for release/dev sync. ([GitHub][9])

## Tagging/Version bump & Release

* **Version bump / tag creation** — Marketplace has several actions and `peter-evans/create-release` / semantic-release integrations for automated tagging. We’ll select one that matches our versioning policy (semver, manual bump on release branch creation, or automated on merge). (Examples: `peter-evans/create-release`, semantic-release actions). *(We’ll pick and pin once we pick exact versioning policy.)*

---

# Topic Heading

## Action selection per workflow (concise mapping)

### Create Release Branch Workflow (milestone created)

* Use `on: milestone` (created) trigger to start.
* Use `peterjgrainger/action-create-branch` to create `release/x.y` from `dev`. (If we need to create from tag for hotfix, use create-from-tag action.) ([GitHub][1])

### Build & Lint checks (PR open / synchronize)

* Use standard actions: `actions/checkout`, `actions/setup-node` (or relevant), run linter/test steps.
* Use `actions/labeler` to auto-label PRs by changed files. Use `github-script` if we need richer labeling logic based on author/team. ([GitHub][4])

### E2E Tests (PR on dev and staging)

* Trigger only for critical bases to save CI consumption: `on: pull_request` with `branches: [dev, staging]`.
* Use our existing E2E runner (Cypress/Playwright) actions and artifacts.

### Version Bump & Tag Creation

* Use a pinned `version-bump` action or `semantic-release` integration depending on whether we want automated vs manual bumping.
* Use `peter-evans/create-release` or native `git` + `actions/github-script` to push tags. (We’ll pick the exact implementation in the custom spec.)

### Backporting Workflows

* Use a label-triggered backport action (backport actions support “label → create cherry-pick PRs into target branch(s)”). Good match for our QA & production backport rules. ([GitHub][10])

### Auto-merge

* Use `pascalgn/automerge-action` conditioned on label + passing checks + reviews. Must test thoroughly with branch protections. ([GitHub][6])

### Branch Synchronization (release ↔ dev)

* Use `repo-sync` style workflow (run on push to dev) to create a PR updating `release/x.y` when dev changes. If conflict, the workflow creates a PR for manual resolution (or we can try an automated rebase step then create PR). ([GitHub][9])

### Retire release/x.y workflow

* Trigger: push of tag `v(x.y+2).0` to `main` → create an Issue to retire `release/x.y` (we can use `peter-evans/create-pull-request` or `actions/github-script` to open the issue). On close of issue: an action using the branch-delete action to delete the branch. ([GitHub][3])

---

## Sub Section Heading

### Starter example workflows (minimal, ready-to-adapt)

#### 1) Create Release Branch (triggered by milestone created)

```yaml
name: Create Release Branch
on:
  milestone:
    types: [created]

jobs:
  create_release_branch:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Create branch release/$REL
        uses: peterjgrainger/action-create-branch@v3
        with:
          branch: release/${{ github.event.milestone.title }} # assumes milestone title is "x.y"
          from: dev
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Notes: we’ll normalise milestone naming (e.g., `1.2`) and add validation in a pre-step (github-script) to parse/validate milestone title and set the `REL` variable. Use the create-branch-from-tag action for hotfix tag→branch creation. ([GitHub][1])

#### 2) Backport on label (simplified)

```yaml
name: Backport on label
on:
  pull_request:
    types: [closed]
jobs:
  backport:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - name: Run backport action
        uses: korthout/backport-action@v2
        with:
          # example inputs: branches: 'staging,dev'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

We’ll configure label-based targeting in action inputs (so we only backport when the PR has the `backport` label or similar). ([GitHub][5])

#### 3) Auto-merge when conditions met

```yaml
name: Auto-merge PRs
on:
  pull_request:
    types: [labeled, opened, synchronize]

jobs:
  automerge:
    runs-on: ubuntu-latest
    steps:
      - name: Auto-merge if ready
        uses: pascalgn/automerge-action@v0.15.0
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

We’ll add `if` conditions (labels, checks) and configure branch-protection-safe behavior in the action inputs. ([GitHub][6])

#### 4) Keep active release branch in sync with dev (repo-sync pattern)

* Use a scheduled or push-triggered job that checks out `dev`, merges/rebases into `release/x.y` and uses `peter-evans/create-pull-request` to open a PR if there are commits to apply. Implement rebase strategy in a run step (attempt fast-forward/rebase, otherwise create PR to resolve conflicts). ([GitHub][9])

---

### Sub Sub-section Heading

## What we’ll implement ourselves (custom work)

* **Milestone validator step**: `github-script` step to parse milestone title and enforce `x.y` format and prevent accidental branch names. (Custom small JS step.)
* **FROZEN_RELEASE guard**: check prior to merges that `FROZEN_RELEASE` file isn’t merged back incorrectly; implement as a linter job step that fails PRs attempting to reintroduce it. (Custom workflow step)
* **Conflict-handling rebase routine** for release ↔ dev sync: an idempotent script that attempts `git rebase --onto` strategy, and falls back to creating a conflict PR. (Custom script run in workflow.)
* **Retire flow** (issue creation + delete on close): a small composite action to create retirement issue and delete branch on issue close. (We’ll author and pin it.)
* **Policy & permission enforcement**: workflows to verify only a bot token can close milestones or delete release branches (enforce via `if` checks and require token identity). (We’ll document required GitHub app / bot permissions.)

---

# Closing remarks

### How our choice solves the problem

* Reusing well-maintained marketplace actions reduces our implementation time for branch creation, PR creation, labeling, backporting and automerging while allowing us to concentrate on the repo-specific rules (FROZEN_RELEASE, milestone naming, rebase policy). The repo-sync / create-pull-request pattern fits our “create PR to resolve sync conflicts” requirement and backport actions map naturally to the label-driven backporting we described. ([GitHub][1])

### Other options we considered (short pros/cons)

| Option                                                        |                                            Pros | Cons                                                               |
| ------------------------------------------------------------- | ----------------------------------------------: | ------------------------------------------------------------------ |
| Full custom actions for everything                            |          Full control, exact policy enforcement | Heavy dev & maintenance cost                                       |
| Mostly Marketplace actions + small glue scripts (recommended) | Fast, lower effort, many battle-tested features | Must vet packages & pin versions; possible extra permissions       |
| Use an external CI/orchestration (Jenkins/GitHub App)         |                         More control, richer UI | Added infra + complexity (we prefer staying inside GitHub Actions) |

### Open questions

* Do we want label-based backporting (apply label to merged PR) or automatic backport of *every* merged PR in release branch?
* Exact versioning policy: auto-semver vs manual bump (needed to choose the tag/version action).
* Which identity (bot/service account) will have the rights to close milestones and delete release branches? We must register a GitHub App or use fine-grained PAT in secrets.

### Next steps / action plan

1. We will pick concrete actions and pin versions for each workflow above (create-branch, backport, automerge, labeler, create-pull-request, repo-sync).
2. Produce the full `.github/workflows/*.yaml` drafts for: Create Release Branch, Branch Sync, Backport, Auto-merge, Tag/Release, and Retire Release flows (we’ll implement custom steps described above).
3. Write the small custom composite actions/scripts: milestone validator; FROZEN_RELEASE guard; rebase-and-fallback sync script; retire-issue-and-delete action.
4. Run a staged rollout in a test repo, iterate on permissions & branch-protection edge cases.
5. Finalize ops SOP for overrides/recovery.

---

References (key docs used)

* Create Branch action (peterjgrainger). ([GitHub][1])
* Backport actions & marketplace backport implementations. ([GitHub][5])
* Automerge action (pascalgn). ([GitHub][6])
* Labeler (actions/labeler). ([GitHub][4])
* Repo-sync patterns (repo-sync). ([GitHub][9])
* Create Pull Request (peter-evans/create-pull-request). ([GitHub][8])

If this matches our expectations, we’ll immediately proceed to produce the **draft workflow YAML files** (complete, pinned, and ready-for-test) and the small custom scripts/composite actions we listed — starting with the Create Release Branch, Branch Sync, and Backport workflows. Should we begin generating the actual workflow files now?

[1]: https://github.com/marketplace/actions/create-branch?utm_source=chatgpt.com "Actions · GitHub Marketplace - Create Branch"
[2]: https://github.com/marketplace/actions/create-a-branch?utm_source=chatgpt.com "Marketplace - Actions - Create a Branch"
[3]: https://github.com/marketplace/actions/delete-multiple-branches?utm_source=chatgpt.com "Delete multiple branches · Actions"
[4]: https://github.com/actions/labeler?utm_source=chatgpt.com "An action for automatically labelling pull requests"
[5]: https://github.com/korthout/backport-action?utm_source=chatgpt.com "korthout/backport-action"
[6]: https://github.com/pascalgn/automerge-action?utm_source=chatgpt.com "pascalgn/automerge-action"
[7]: https://github.com/marketplace/actions/review-assign-action?utm_source=chatgpt.com "Review Assign Action - GitHub Marketplace"
[8]: https://github.com/peter-evans/create-pull-request?utm_source=chatgpt.com "peter-evans/create-pull-request"
[9]: https://github.com/repo-sync/repo-sync?utm_source=chatgpt.com "Repo Sync"
[10]: https://github.com/marketplace/actions/backporting?utm_source=chatgpt.com "Marketplace - Actions - Backporting"
