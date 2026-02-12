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
pnpm run watch -- --port 3001

# Terminal 2: Kolibri server with matching CSP and custom server port
WEBPACK_DEV_SERVER_PORT=3001 kolibri start --foreground --port=8001 --settings=kolibri.deployment.default.settings.dev
```

## 3. Provision and Seed via Load Testing Toolkit

Starting the Kolibri server automatically runs database migrations, but a fresh `KOLIBRI_HOME` still needs device provisioning, users, and content to be useful. The `integration_testing/load_testing/` toolkit handles all of this via the REST API.

Start the Kolibri server first, then provision and seed:

```bash
cd integration_testing/load_testing

# Provision device and create facility
python loadtest.py provision --server http://localhost:8001 --username admin --password admin
python loadtest.py setup-facility --server http://localhost:8001 --username admin --password admin

# Create learners enrolled in a classroom
python loadtest.py import-users --server http://localhost:8001 --username admin --password admin --users 10

# Import QA channel content (downloads from Studio — requires internet)
python loadtest.py import-channel --server http://localhost:8001 --username admin --password admin

# Create a lesson with mixed content types
python loadtest.py create-lesson --server http://localhost:8001 --username admin --password admin
```

This creates a superuser (`admin`/`admin`), a "Load Test Facility" with a "Load Test Class" classroom, 10 learner accounts (`load_test_1` through `load_test_10`, password: `password`), imports the QA channel from Studio, and creates a lesson with diverse content types.

See `integration_testing/load_testing/kolibri_client.py` for the API client that can also be used programmatically.

## Complete Isolated Setup Example

```bash
# 1. Environment isolation
export KOLIBRI_HOME="$(pwd)/.kolibri_home"
export KOLIBRI_RUN_MODE=dev

# 2. Start webpack dev server on a unique port
pnpm run watch -- --port 3001

# 3. In another terminal: start Kolibri server (runs migrations automatically on first start)
export KOLIBRI_HOME="$(pwd)/.kolibri_home"
export KOLIBRI_RUN_MODE=dev
WEBPACK_DEV_SERVER_PORT=3001 kolibri start --foreground --port=8001 --settings=kolibri.deployment.default.settings.dev

# 4. In another terminal: provision and seed
cd integration_testing/load_testing
python loadtest.py provision --server http://localhost:8001 --username admin --password admin
python loadtest.py setup-facility --server http://localhost:8001 --username admin --password admin
python loadtest.py import-users --server http://localhost:8001 --username admin --password admin --users 10
python loadtest.py import-channel --server http://localhost:8001 --username admin --password admin
python loadtest.py create-lesson --server http://localhost:8001 --username admin --password admin
```
