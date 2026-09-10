# Legacy Prototype Code Archives

These patches preserve the complete file changes made on the two original
prototype branches. They are historical reference material for the current
Living Thesis implementation. See the [architecture assessment](../../LIVING_THESIS_ARCHITECTURE.md)
and [current roadmap](../../ROADMAP.md) before reusing any prototype code.

Both patches start from commit
`532f82519835070225d85b5fe6face910d521b4e`, whose Git tree is
`cf7d52277ae322908ab864753da1dd9e6aebedff`. That base is part of the existing
repository history. Recovery needs the base plus the selected patch; it does
not require the old branch or an archive tag.

| Original branch | Patch | Recorded branch tip |
| --- | --- | --- |
| `feature/thesis-board-adopt-model` | [thesis-board-adopt-model.patch](thesis-board-adopt-model.patch) | `4d8dd622d0b011b50a876eb7f992c728b12a8e1c` |
| `feature/review-workflow` | [review-workflow.patch](review-workflow.patch) | `b9ba5aba987c11b0c93c22b0dfda7d63075ff337` |

Each file is one cumulative Git diff, including full blob IDs, from the shared
base to the recorded tip. Applying it recreates the original file tree. It
does not recreate the original two-commit history, authorship metadata, or
commit IDs. The original commit identities are recorded below; optional tags
can preserve those Git objects as described in [Prototype Branch Archival](../PROTOTYPE_BRANCHES.md).

## Original work and commits

### Thesis Board adoption

- `ba7eb306848ff330a6ba000aa3b6e8b62e7566c7` — Add shared Living Thesis model.
- `4d8dd622d0b011b50a876eb7f992c728b12a8e1c` — Adopt Living Thesis model in Thesis Board.

The prototype changes four files: the core model and exports, the Board, and
its mock-data adapter. It derives example factor scores and history from mock
records and keeps editing local. The current persisted Board supersedes it.

### Review workflow

- `a48026d74d74d661280d31bc543202268c4d31f9` — Add shared Living Thesis model.
- `b9ba5aba987c11b0c93c22b0dfda7d63075ff337` — Add Living Thesis review workflow foundation.

The prototype changes four core files: the model, exports, workflow, and four
workflow tests. It contains a six-step in-memory review flow, a score draft,
and a review reason. It has no review screen or persistence. The current
validated workflow and durable draft storage supersede this implementation.

The two model commits produce identical file trees; each patch includes that
model independently so either prototype can be restored on its own.

## Recover the Thesis Board prototype

Use a full local clone after the archive PR has merged into `main`, with the
archive files available in your checkout. The commands below assume that the
clone folder is named `MKII_Test` and that you start in its root. If its name
differs, adjust the patch path that begins `../MKII_Test/`.

Recovery uses a separate sibling worktree. Choose a new directory if the shown
destination already exists. Run commands one at a time and stop on any error.
A shallow clone must fetch its full history first using
`git fetch --unshallow origin`. Apply only one prototype patch to each fresh
base worktree.

```bash
git fetch origin
git worktree add --detach ../MKII_Test-board-prototype 532f82519835070225d85b5fe6face910d521b4e
git -C ../MKII_Test-board-prototype apply --check ../MKII_Test/docs/archive/prototypes/thesis-board-adopt-model.patch
git -C ../MKII_Test-board-prototype apply --index ../MKII_Test/docs/archive/prototypes/thesis-board-adopt-model.patch
git -C ../MKII_Test-board-prototype write-tree
```

The final command must print
`ab25a96c3d7694c5236b67c9b43e27e490583405`. This is the original Board branch's
complete Git tree, covering all 161 tracked files and their modes. The restored
changes are staged in the separate worktree; no new commit has been created.

## Recover the review workflow prototype

From the same `MKII_Test` clone root, use a different fresh worktree:

```bash
git fetch origin
git worktree add --detach ../MKII_Test-review-prototype 532f82519835070225d85b5fe6face910d521b4e
git -C ../MKII_Test-review-prototype apply --check ../MKII_Test/docs/archive/prototypes/review-workflow.patch
git -C ../MKII_Test-review-prototype apply --index ../MKII_Test/docs/archive/prototypes/review-workflow.patch
git -C ../MKII_Test-review-prototype write-tree
```

The final command must print
`de74c838ebc7317a726aa4673ba6d1de09baabb2`, the original review branch's complete
Git tree covering all 163 tracked files and their modes. A tree mismatch means
the restoration has not been verified; investigate before using it as a backup.

To continue experimenting, create a new branch inside the recovered worktree
and commit the staged changes. That produces a new commit containing the
historical files, not the original branch-tip commit.

## Verification and branch cleanup

On 2026-09-10, the changed source blobs and complete tree metadata were checked
against GitHub object IDs. Each patch was applied to an isolated Git index at
the recorded base. The resulting tree matched the original branch tree above,
and each changed file matched its original blob ID. Reversing either patch
restored the exact base tree. Patch files retain their exact bytes on checkout,
including on systems that normally convert text line endings.

Before removing the prototype branches, merge this archive PR into `main`,
confirm both files are present there, and verify recovery. Also confirm that
both remote branch tips still match the recorded commits. Newer commits would
need a new archive. The guarded deletion command and optional tag method are
in [Prototype Branch Archival](../PROTOTYPE_BRANCHES.md).
