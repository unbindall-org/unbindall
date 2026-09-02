# Document Versioning and Autosave

Every cloud configuration has a directly readable current state (`configs`) and an immutable revision log (`config_revisions`). The head keeps normal reads independent of history length; the log can reconstruct every server-confirmed revision.

## Write operation

Creating a configuration, making a manual save point, autosaving, restoring, and moving into or out of trash always happen in one PostgreSQL transaction:

1. Lock the current configuration row with `FOR UPDATE`.
2. Compare `expectedRevision` with the current revision.
3. Append a new immutable revision.
4. Update the head's document, hash, revision number, and timestamp.

A mismatched revision returns `CONFLICT`, preventing an older browser tab from overwriting a newer state. Every mutation carries a globally unique `mutationId`; retransmitting the same mutation does not create another revision. Manual save points may also have a user-defined name.

## Snapshots and patches

- Revision 1 is always a complete snapshot.
- At least every 50th revision is a snapshot.
- A patch that takes at least 40 percent of the complete document's size is stored as a snapshot.
- Arrays are replaced atomically; objects are compared field by field.
- SHA-256 over canonical JSON protects the integrity of reconstructed states.

Reconstructing any historical state therefore applies at most 49 patches after its latest snapshot. `GeneratorDocument` remains the canonical source of truth; the current CFG output is generated from it and cached only on the head for exports.

## Autosave

The browser always saves the draft locally first. An active cloud configuration is also saved after one second of inactivity, or after at most five seconds of continuous editing. The latest unconfirmed autosave stays in IndexedDB across reloads and offline periods.

The UI distinguishes local, pending, syncing, saved, offline, and conflict states. A conflict retains the local state and its queue until the user deliberately loads the server state or resolves it another way.

## Restore and deletion

A restore never changes an existing revision. It creates a new head of type `restore`, so the restore itself can be undone. The point-in-time endpoint resolves an ISO timestamp to the last revision at or before that time; revision number breaks equal-time ties.

Normal deletion creates a `delete` revision and sets `deleted_at`. The configuration and its history remain in trash. Only explicit permanent deletion removes the configuration and revisions through the foreign-key cascade. Account deletion continues to remove all associated data.

This application-level history is not an infrastructure backup. Neon/PostgreSQL point-in-time recovery remains necessary for complete database loss or administrative mistakes.
