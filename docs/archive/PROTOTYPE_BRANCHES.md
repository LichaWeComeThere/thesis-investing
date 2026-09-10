# Prototype Branch Archival

The following prototypes predate the current Living Thesis implementation.
Each branch contains two commits outside `main`; preserve its tip before
removing the branch. This guide records the heads verified on 2026-09-10 and
provides manual commands. It does not claim that the tags already exist.

| Branch | Archive tag | Verified commit |
| --- | --- | --- |
| `feature/thesis-board-adopt-model` | `archive/thesis-board-prototype` | `4d8dd622d0b011b50a876eb7f992c728b12a8e1c` |
| `feature/review-workflow` | `archive/review-workflow-prototype` | `b9ba5aba987c11b0c93c22b0dfda7d63075ff337` |

The tag at each tip preserves access to that commit and its ancestors. No
prototype code needs to be merged into `main` to retain it.

## Create and verify remote tags

Run these commands from an existing local Git repository with GitHub write
access. Each command names `LichaWeComeThere/MKII_Test` explicitly, avoiding any
assumption about the local `origin`. They do not change checked-out files.
Stop if a command fails; do not proceed to branch deletion without verifying
both remote tags. If either branch has changed, review its new commits first.

```bash
git fetch https://github.com/LichaWeComeThere/MKII_Test.git refs/heads/feature/thesis-board-adopt-model refs/heads/feature/review-workflow
git push --atomic https://github.com/LichaWeComeThere/MKII_Test.git 4d8dd622d0b011b50a876eb7f992c728b12a8e1c:refs/tags/archive/thesis-board-prototype b9ba5aba987c11b0c93c22b0dfda7d63075ff337:refs/tags/archive/review-workflow-prototype
git ls-remote --tags https://github.com/LichaWeComeThere/MKII_Test.git refs/tags/archive/thesis-board-prototype refs/tags/archive/review-workflow-prototype
```

The last command must show both tags pointing to the exact commits in the
table. The push does not force-replace existing tags. If a tag exists at a
different commit, stop and investigate rather than overwriting it.

## Delete the preserved branches

After verifying both remote tags, run this single command:

```bash
git push --atomic --force-with-lease=refs/heads/feature/thesis-board-adopt-model:4d8dd622d0b011b50a876eb7f992c728b12a8e1c --force-with-lease=refs/heads/feature/review-workflow:b9ba5aba987c11b0c93c22b0dfda7d63075ff337 https://github.com/LichaWeComeThere/MKII_Test.git :refs/heads/feature/thesis-board-adopt-model :refs/heads/feature/review-workflow
```

The explicit leases require both branch tips to match the reviewed commits.
The atomic push rejects the whole deletion if either branch advanced or a
server rule blocks it. Do not remove these checks or force a retry.

Verify the result:

```bash
git ls-remote --heads https://github.com/LichaWeComeThere/MKII_Test.git refs/heads/feature/thesis-board-adopt-model refs/heads/feature/review-workflow
git ls-remote --tags https://github.com/LichaWeComeThere/MKII_Test.git refs/tags/archive/thesis-board-prototype refs/tags/archive/review-workflow-prototype
```

The first command should return no matching heads. The second should still
show both archived commits. Keep `main` and any active PR branches.

## Recover prototype work later

Fetch the archive tags into a clone and create a new branch from the selected
tag when needed. Keep the historical code separate from current application
work unless a new review selects specific changes to port.
