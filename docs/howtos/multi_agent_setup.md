# Multi-Agent / Multi-Worktree Setup

When multiple agents run simultaneously on the same machine (e.g., in separate git worktrees), each needs an isolated environment to avoid database locking, port conflicts, and state collisions.

## 1. Isolate KOLIBRI_HOME

Each agent must use its own `KOLIBRI_HOME` directory. The default (`~/.kolibri`) is shared and will cause database locking conflicts.

```bash
export KOLIBRI_HOME="$(pwd)/.kolibri_home"
```

## 2. Use Unique Ports

Each agent needs a unique Kolibri server port and a unique webpack dev server port. When changing the webpack port, set `WEBPACK_DEV_SERVER_PORT` on the Kolibri server so its CSP headers allow script loading from the correct origin:

```bash
# Terminal 1: webpack dev server on custom port
pnpm watch --port 3001

# Terminal 2: sandbox dev server
pnpm sandbox-dev

# Terminal 3: Kolibri server with matching CSP and custom server port
WEBPACK_DEV_SERVER_PORT=3001 kolibri start --debug --foreground --port=8001 --settings=kolibri.deployment.default.settings.dev
```

## 3. Provision and Seed

A fresh `KOLIBRI_HOME` needs device provisioning, users, and content. See `docs/howtos/dev_data_setup.md` for full instructions. Adjust the `--server` URL to match the port used above (e.g., `http://localhost:8001`).

## Complete Isolated Setup Example

```bash
# 1. Environment isolation
export KOLIBRI_HOME="$(pwd)/.kolibri_home"
export KOLIBRI_RUN_MODE=dev

# 2. Start webpack dev server on a unique port
pnpm watch --port 3001

# 3. In another terminal: start sandbox dev server
export KOLIBRI_HOME="$(pwd)/.kolibri_home"
export KOLIBRI_RUN_MODE=dev
pnpm sandbox-dev

# 4. In another terminal: start Kolibri server (runs migrations automatically on first start)
export KOLIBRI_HOME="$(pwd)/.kolibri_home"
export KOLIBRI_RUN_MODE=dev
WEBPACK_DEV_SERVER_PORT=3001 kolibri start --debug --foreground --port=8001 --settings=kolibri.deployment.default.settings.dev

# 5. Provision and seed — see docs/howtos/dev_data_setup.md (use --server http://localhost:8001)
```
