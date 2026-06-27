
Kolibri Load‑Testing CLI — Quick Start
======================================

Run from ``integration_testing/load_testing/``. The entrypoints are ``loadtest.py`` (set up and load-test one server) and ``bench.py`` (compare builds; see `Comparing builds with bench.py`_).

Prerequisites
-------------
Before running load tests:

1. **Install uv**: ``loadtest.py`` declares its dependencies inline (PEP 723) and runs under ``uv run --script`` in its own environment, separate from Kolibri's venv.

2. **Start Kolibri server** (NOT development server):

   .. code-block:: bash

      # Use port 8080 for production-like server
      kolibri start --port=8080

   **Server state**: The server can be either:

   - **New KOLIBRI_HOME/unprovisioned** - the tool will provision it for you
   - **Existing KOLIBRI_HOME** - the tool will use existing setup

   **Important**: Do NOT use ``pnpm run devserver`` - load tests must run against a
   production-like server to get accurate performance measurements. The development
   server has additional overhead that will skew results.

Help
----
.. code-block:: bash

   ./loadtest.py --help
   ./loadtest.py run --help

See the help for available flags (e.g., users, spawn rate, duration, headless, retries).

Full provision → manual capture → test
--------------------------------------
Runs the whole flow against a Kolibri server (provisioned or unprovisioned):

* **Fresh server**: Provisions device → creates facility/users/class → imports QA channel → creates lesson
* **Existing server**: Uses existing setup where possible, creates missing components

The tool prompts for admin credentials which are used to either:

* Create a NEW admin account (if provisioning a fresh server)
* Authenticate with EXISTING admin account (if server already provisioned)

Then opens a browser for **manual capture** → saves a versioned HAR → executes the Locust test.

.. code-block:: bash

   ./loadtest.py

Full run using an existing HAR (skip capture)
---------------------------------------------
Use a pre-recorded HAR to skip the manual capture step. For example, with the committed 0.19.4 HAR:

.. code-block:: bash

   ./loadtest.py --har har_files/lesson_flow_kolibri_0.19.4.har

Other flags
-----------

Non-interactive server and credentials:

.. code-block:: bash

   ./loadtest.py --server http://127.0.0.1:8080 --username admin --password sosecure

Headless 10‑minute run at modest scale:

.. code-block:: bash

   ./loadtest.py --headless -u 100 -r 50 -t 10m run

HAR Files
---------
HAR files capture the exact sequence of HTTP requests made during a learner lesson interaction.

**When to use existing HAR files**:

* The committed HAR file's version is ≤ your Kolibri version AND there have been no
  frontend request pattern changes since that version
* Example: ``lesson_flow_kolibri_0.18.4.har`` can be used for testing 0.18.4, 0.18.5,
  0.18.6, etc., as long as no frontend changes affected learner request patterns

**When to create new HAR files**:

* Frontend code changes that modify the pattern of HTTP requests during learner interactions
* New Kolibri version where request patterns have changed
* Adding new content types or interaction flows to test

**Selection**: ``run`` uses ``har_files/lesson_flow_kolibri_<server version>.har`` when it exists. Otherwise it falls back to the newest HAR not newer than the server (or the oldest HAR, if all are newer) and logs a warning; static bundle URLs are rewritten to the server's version at replay time, and static files the server lacks (numbered chunks, content-hashed fonts) are skipped with a warning. Pass ``--har`` to choose a file explicitly. HAR files are stored with Git LFS.

**Content origin**: requests the HAR made to Kolibri's HTML5 content origin (``/content/zipcontent/`` and the sandbox) are replayed against the server's content origin, read from the ``__zipContentOrigin``/``__zipContentPort`` settings on its pages, as the browser does, and reported under names prefixed ``zip``. If a page has neither, those requests are skipped with a warning.

**Versioning**: HAR files are named with the Kolibri version where they were captured
(e.g., ``lesson_flow_kolibri_0.18.4.har``). This version acts as a "valid from" marker -
the HAR can be used for that version and later versions until request patterns change.
Committed HAR files for released versions are preserved in version control.
``lesson_flow_kolibri_0.19.4.har`` was captured on ``0.19.5.dev0+git.20260604030828`` and covers the 0.19.4 lesson flow.

Comparing builds with bench.py
------------------------------
``bench.py`` runs the load test against a baseline build and then each comparison build. Every run starts from a fresh copy of the same template ``KOLIBRI_HOME``, and results land in ``generated/results/<name>_<suffix>/``.

.. code-block:: bash

   ./bench.py run --baseline base=release:0.19.4 fix=pr:14770 \
       --suffix r1 --username admin --password admin
   ./loadtest.py compare base_r1 fix_r1

Targets are ``name=spec``:

* ``pr:<number>``: the PR's CI wheel, downloaded with an authenticated ``gh`` CLI
* ``release:<version>``: the wheel from PyPI, downloaded with ``pip`` (or ``uv tool run pip`` when only uv is installed)
* ``path/to/kolibri.whl``: a local wheel
* ``worktree:<path>``: a wheel built with ``make dist`` in that worktree's ``.venv``, so it needs ``uv sync`` (this clears its ``dist/``)
* ``dev:<path>``: that worktree's ``.venv``; local runs only, and needs ``uv sync`` and a current ``pnpm build``

The baseline must be 0.18 or newer. It must also be the oldest version, since Kolibri cannot migrate a database backwards. Every target replays the HAR chosen for the baseline's version. The template is generated from the baseline by ``loadtest.py setup`` and cached under ``generated/templates/``; pass ``--regenerate-template`` to rebuild it. Only the most recently used 2 templates, 4 venvs and 8 PR/worktree wheels are kept.

Local runs need Linux: they use GNU ``cp --reflink``. Wheels install into the Python that runs ``bench.py``, so for baselines that cap it (0.18.0 to 0.19.3 need Python < 3.14) run ``uv run --python 3.13 ./bench.py …``.

Remote devices
~~~~~~~~~~~~~~
To run the servers on another device (e.g. a Raspberry Pi) while load comes from this machine, pass the device's name to ``run``:

.. code-block:: bash

   ./bench.py run --device pi4 --baseline base=release:0.19.4 fix=pr:14770 \
       --suffix r1 --username admin --password admin

The name is the device's hostname, with characters other than letters, digits, ``_`` and ``-`` replaced by ``-``. ``run`` starts a hub on port 8765 and, until that device connects, prints a one-line install command and waits. On the device, run that command:

.. code-block:: bash

   curl -sf -H 'X-Bench-Token: <token>' http://<host>:8765/agent.py | python3 -

The agent stops when its shell exits, so over SSH run it inside ``tmux`` or under ``nohup``. It needs Python 3.6+ with ``venv`` and ``pip``, and no other packages. It keeps state under ``~/.kolibri_bench/`` and reconnects whenever a hub restarts.

The hub also advertises itself over mDNS as ``kolibri-bench.local`` and prints a command using that name, unless its host resolves to loopback; it then prints ``mDNS off`` and only the IP command. Use the IP form if the device cannot resolve it.

To see a device's name before a run, start ``./bench.py listen``, which prints each device as it connects (``./bench.py devices`` lists them while it runs). Stop ``listen`` before ``run``, since both use port 8765; the agent re-registers with the new hub automatically.

The hub ships each wheel and the template to the device. ``dev:`` targets cannot run remotely. Use ``--hub-host`` if the address the hub prints is not reachable from the device.

Every hub request, including the ``agent.py`` download, needs the token stored in ``generated/hub_token``. Anyone holding it can make an agent install and run arbitrary code, so keep it private. The hub speaks plain HTTP, so use it on a trusted network only.
