This is the plan document for our github automation.

## Requirements

### Branch Management
- The system should automate creation and deletion of release branches as per the release cycle.
- The system should automate creation and deletion of hotfix branches as per the hotfix cycle.
- The system should automate creation and deletion of feature branches as per the feature cycle.
- The system should automate creation and deletion of bugfix branches as per the bugfix cycle.

### Pull Request Management
- The system should automate mergeability checks for pull requests.
- The system should automate labeling of pull requests based on predefined criteria.
- The system should automate assignment of reviewers to pull requests based on predefined criteria.
- The system should be able to automatically merge pull requests that meet certain criteria.
- The system should manage comments on pull requests to ensure clarity and relevance.

### Branch Synchronization
- Some branches should be automatically kept in sync with their parent branches to ensure consistency.
- The system should handle conflicts and create pull requests for synchronization when necessary.

## Approach

- For branch management, we will use Github Milestones and Issues for automation triggers.
- For pull request management, we will use Github Actions to automate the various tasks.
- For branch synchronization, we will use push events to trigger synchronization workflows.


## Release Cycle

### Standard Flow

- A biweekly release cycle is followed. In days, we have 15 days release cycle. 2 cycles per month.
- On start of each cycle, a release/x.y branch is created from the dev branch.
- On end of the cycle, the release/x.y branch is merged into dev branch.
- A new release/x.y+1 branch is created from dev branch for the next cycle.
- Finally dev branch is merged into staging branch for QA testing.
- In staging branch, bugs found are fixed in bugfix branches created from release/x.y branch.
- Bugfix branches are merged back into release/x.y branch and the release/x.y branch is merged into staging branch for testing.
- After successful testing, the release/x.y branch is merged into dev branch for backporting.
- After 15 days of successful testing in staging branch (i.e. when release/x.y+2 is initiated), staging branch is merged into test branch for UAT.
- Generally, test branch is merged into main branch marking beginning of support cycle for release/x.y.
- The release/x.y branch will live until the next release/x.y+1 is deployed to production. This ensures hotfixing if needed without disrupting QA or development cycle.

### Hotfix Flow
- Hotfixes are created when a critical bug is found in production which needs fixing out of the regular release cycle.
- The currently deployed release/x.y branch will be used to create a hotfix/x.y.z branch.
- The hotfix/x.y.z is tested in isolation (using preview deployments) and merged back into release/x.y branch.
- The release/x.y branch is then directly merged into test branch and test is then merged into main branch for deployment.
- The release/x.y branch can then also be merged back into dev and staging branches to ensure the hotfix is backported. This can be omitted if the hotfix is no longer relevant to ongoing development (for example the feature is deprecated in upcoming release).

## Workflows

Based on all the above, we have the following workflows finalized:

### Core Workflows
- Create Release Branch Workflow (on milestone created)
- Build, and Lint Checkes Workflow (on PR creation and synchronize on base dev, staging, and release/x.y branches)
- E2E Tests Workflow (on PR creation on base dev, and staging branches)
- Version Bump Worklow (on Release Branch creation, and during hotfixing)
- Tag Creation Workflow (on PR merge to dev, staging, test, and main branches)

### Automation Workflow
- Backporting Workflow during QA: if a PR from release/x.y branch is merged to staging branch, then the dev is rebased to include the changes from release/x.y branch)
- Backporting Workflow in Production: if a PR from release/x.y branch is merged to test branch, then, two PRs are created, 
    - 1st to merge the changes back to dev, and
    - 2nd to merge the changes back to staging branch.

- Branch Synchronization Workflow: active release/x.y branch is kept in sync with dev branch. If there are conflicts, a PR is created to resolve them. Rebase strategy is used to keep the history clean.

- Retire release/x.y branch: when a commit with tag v(x.y+2).0 is pushed to main branch, an issue is created to retire the release/x.y branch. On closing the issue, the release/x.y branch is deleted.

## Setup

### Create Release Branch Workflow

Trigger: On milestone Created
Steps:
- Check if the milestone has a title with structure Release x.y
- If yes, extract the version x.y from the title
- Check if a release/x.y branch exist
- If yes, rebase from dev to ensure the branch is up-to date
- If no, create a new release/x.y branch
- Check package.json to see current version. The version has the structure x.y.z. If x.y matches release/x.y then do nothing, else bump the version to x.y.0

Approach:
- Mark general structure and permissions required
- Do internet search and mark what steps can be implemented using third-party actions
- Write the first draft

Begin

### E2E Tests Workflow

Trigger: On PR creation on base dev, and staging branches
Steps:
- Checkout the code
- Setup Node environment using .nvmcr file
- Install dependencies using npm ci
- Run E2E tests using npm run e2e:ci
- Post results as a comment on the PR
- If tests fail, mark the PR as failed

Approach:
- Mark general structure and permissions required
- Do internet search and mark what steps can be implemented using third-party actions
- Write the first draft
