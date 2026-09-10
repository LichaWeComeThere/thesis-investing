# Prototype Branch Archival

The following prototypes predate the current Living Thesis implementation.
Each branch contains two commits outside `main`. Preserve its code with the
[patch archives](prototypes/README.md), or preserve the original Git commits
with tags, before removing the branch. This guide records the heads verified
on 2026-09-10 and provides manual commands. It does not claim that tags already
exist or that branches have been deleted.

| Branch | Archive tag | Verified commit |
| --- | --- | --- |
| `feature/thesis-board-adopt-model` | `archive/thesis-board-prototype` | `4d8dd622d0b011b50a876eb7f992c728b12a8e1c` |
| `feature/review-workflow` | `archive/review-workflow-prototype` | `b9ba5aba987c11b0c93c22b0dfda7d63075ff337` |

Patch archives recreate the original file contents from the recorded shared
base. A tag at each tip preserves access to the original commit and its
ancestors. The archived code is historical reference material.

## Preserve the code through files in main

First merge the PR containing both [prototype patches](prototypes/README.md)
into `main` and confirm that both patch files are available there. Follow the
recovery instructions and verify each complete Git tree against its recorded
value. A pending PR or commit IDs alone are not the file archive.

Confirm that both remote branch heads still match the commits in the table.
If either has changed, archive and verify the additional work first. Once the
file archives are merged and verified, the guarded deletion command below can
be used without creating tags. Creating tags is still an option when retaining
the original commit history is desired.

## Alternatively, create and verify remote tags

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

After verifying either the merged file archives or both remote tags as
described above, run this single command:

```bash
git push --atomic --force-with-lease=refs/heads/feature/thesis-board-adopt-model:4d8dd622d0b011b50a876eb7f992c728b12a8e1c --force-with-lease=refs/heads/feature/review-workflow:b9ba5aba987c11b0c93c22b0dfda7d63075ff337 https://github.com/LichaWeComeThere/MKII_Test.git :refs/heads/feature/thesis-board-adopt-model :refs/heads/feature/review-workflow
```

The explicit leases require both branch tips to match the reviewed commits.
The atomic push rejects the whole deletion if either branch advanced or a
server rule blocks it. Do not remove these checks or force a retry.

Verify the result:

```bash
git ls-remote --heads https://github.com/LichaWeComeThere/MKII_Test.git refs/heads/feature/thesis-board-adopt-model refs/heads/feature/review-workflow
```

The command should return no matching heads. If you used the tag method, also
verify that both tags still point to the recorded commits:

```bash
git ls-remote --tags https://github.com/LichaWeComeThere/MKII_Test.git refs/tags/archive/thesis-board-prototype refs/tags/archive/review-workflow-prototype
```

Keep `main` and any active PR branches.

## Recover prototype work later

Follow the [patch recovery instructions](prototypes/README.md) to recreate the
original files from the shared base. If archive tags exist, you can instead
fetch those tags and create a branch from the selected tag. Review any changes
you intend to port against the current application architecture.
