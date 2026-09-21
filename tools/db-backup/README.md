# db-backup

Takes a **verified, encrypted** logical backup of the registry's Postgres,
daily, and keeps it for 90 days.

Workflow: [`.github/workflows/db-backup.yml`](../../.github/workflows/db-backup.yml)
· Verification: [`verify.js`](verify.js) · Tests: [`tests/db-backup.test.js`](../../tests/db-backup.test.js)

## Why this exists

Render's free Postgres plan has **no backups of any kind** — no snapshots,
no point-in-time recovery, no fork. Render's own documentation says to run
`pg_dump` yourself. When this repo's two databases were lost in March 2026
there was no backup, and the data was simply gone.

`tools/db-health` tells you the database is *about to* disappear. This tells
you that you can survive it if it does. They are different jobs and neither
substitutes for the other.

It is also the prerequisite for any free-tier **rotation**. Only one free
Postgres may be active per account, so a replacement cannot be created until
the old one is deleted — there is an unavoidable window in which this dump
is the only copy of the data that exists anywhere. Never start a rotation
without a recent run of this workflow that **passed verification**.

## Producing a file is not producing a backup

The entire value of this job is concentrated in one moment — a recovery,
when the live database is gone and the dump is all there is. A job that
goes green while writing an empty or truncated file is *worse than nothing*:
it manufactures confidence exactly where being wrong is most expensive.

This repo has already lived that failure once. `GET /health` returned a
correct, unambiguous 503 for six months and nothing asked. So this job
verifies its own output before claiming success, and
[`verify.js`](verify.js) is where that judgement lives:

| Check | Catches |
| --- | --- |
| File exists, ≥ 1 KiB | `pg_dump` wrote nothing, or died after the header |
| Starts with `PGDMP` | Not a dump at all — an error message or HTML page redirected into the file |
| Expected tables in the archive's own table of contents | Dumped the *wrong* database, or one where migrations never ran |

The third is the one with teeth. **A never-migrated database dumps
perfectly happily** — the archive is well-formed, correctly compressed, and
contains none of your data. That is precisely the state a rotation's fresh
instance is in before `prisma migrate deploy` runs, which is exactly when
someone might write it over the top of their only good backup.

Identity is read from the dump's **own** table of contents rather than by
re-querying the server, because the artifact that would actually be
restored is the thing under test.

**Deliberately not checked: row counts.** An empty registry is legitimate,
and asserting otherwise would make this job start failing the day someone
clears test data — the same reasoning `db-health`'s schema probe gives for
not asserting `total > 0`.

## The dump is encrypted because this repository is public

Artifacts on a public repository can be downloaded by anyone. An
unencrypted dump here would publish every user record in the database.

So the dump is symmetrically encrypted (`gpg`, AES-256) **before** the
upload step, the plaintext is deleted on the runner, and the job then
asserts that nothing without a `.gpg` extension remains in `backup/` —
refusing to upload if anything does. The plaintext never leaves the runner.

## Configuration

Two repository secrets. The job **fails loudly** when either is missing
rather than skipping, because a backup workflow that reports success
without producing a backup is the exact pathology described above.

| Secret | What |
| --- | --- |
| `BACKUP_DATABASE_URL` | The **external** connection string (`*.oregon-postgres.render.com`). The internal `dpg-*` host only resolves inside Render and will not work from a GitHub runner. |
| `BACKUP_PASSPHRASE` | Strong passphrase for the symmetric encryption. **Store it somewhere that is not this repository.** Without it every artifact this job produces is unreadable, and therefore worthless. |

## Restoring

```bash
gpg --decrypt --output registry.dump registry.dump.gpg
pg_restore --no-owner --no-acl --dbname "$TARGET_DATABASE_URL" registry.dump
```

`--no-owner --no-acl` on both the dump and the restore is what lets the
archive land in a **new** instance whose generated role name differs from
the original — the rotation case this backup is primarily meant to serve.

## What this does not do

It does not prevent the expiry, and it does not perform a rotation. The
durable fix for a database you care about is a paid plan, which also brings
continuous backups with point-in-time recovery. This job is what makes the
free plan survivable, not what makes it safe.
