# likho-mfe-admin

The admin app of the Likho web app: the people of the workspace and what they may do,
invitations, API keys, the workspace settings and the audit log. Loaded by
[likho-web-shell](https://github.com/likho-ai/likho-web-shell) at `/admin` through Module
Federation; this repository exposes `./App`. Only admins see it (the shell shows the link to
admins; the API refuses everyone else).

React 19, Vite 8, Tailwind CSS v4 with the likho-ui tokens, likho-web-sdk.

## What it does

- **People:** everyone in the workspace with their role (admin, member, viewer), changed in
  place; disable someone (signed out at once, cannot sign in) and enable them again. You cannot
  change your own role or disable yourself.
- **Invitations:** an email, a name and a role make a one-time link, good for seven days. It is
  mailed when the API has mail set up, and shown here either way to copy and pass on. Open
  invitations can be revoked; accepted and expired ones stay listed.
- **API keys:** made once, shown once, revocable; for scripts and the dialer connector.
- **Workspace:** auto-transcribe on or off; the models the workers can run.
- **Audit log:** every change with who made it, newest first, by kind of change or by exact
  action, page by page.

## Run it

```bash
pnpm install
pnpm dev            # http://localhost:5176/mfe/admin/ on its own, against the gateway's API
```

In the product the shell loads `/mfe/admin/remoteEntry.js`; `pnpm dev` here plus `pnpm dev` in the
shell gives the real layout through http://localhost:8080/admin.

## Develop

```bash
pnpm test && pnpm lint && pnpm typecheck && pnpm build
docker build -t likho-mfe-admin .    # nginx serving the built files under /mfe/admin/
```

Settings: `.env.development`, `.env.staging`, `.env.production` (Vite modes). The stylesheet is
scoped under `[data-mfe="admin"]` (see `vite.config.ts`), so its classes never affect the shell.
