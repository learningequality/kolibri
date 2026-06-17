
Kolibri Load‑Testing CLI — Quick Start
======================================

Run from ``integration_testing/load_testing/``; entrypoint is ``loadtest.py``.

Prerequisites
-------------
Before running load tests:

1. **Install dependencies**:

   .. code-block:: bash

      pip install -r requirements/load_test.txt

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

   python loadtest.py --help
   python loadtest.py --help
   python loadtest.py run --help

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

   python loadtest.py

Full run using an existing HAR (skip capture)
---------------------------------------------
Use a pre-recorded HAR to skip the manual capture step. With a file in ``har_files/lesson_flow_kolibri_testing_high_latency.har``, for example:

.. code-block:: bash

   python loadtest.py --har har_files/lesson_flow_kolibri_testing_high_latency.har

Other flags
-----------

Non-interactive server and credentials:

.. code-block:: bash

   python loadtest.py --server http://127.0.0.1:8080 --username admin --password sosecure

Headless 10‑minute run at modest scale:

.. code-block:: bash

   python loadtest.py --headless -u 100 -r 50 -t 10m run

HAR Files
---------
HAR files capture the exact sequence of HTTP requests made during a learner lesson interaction.

**When to use existing HAR files**:

* The committed HAR file's version is ≥ your Kolibri version AND there have been no
  frontend request pattern changes since that version
* Example: ``lesson_flow_kolibri_0.18.4.har`` can be used for testing 0.18.4, 0.18.5,
  0.18.6, etc., as long as no frontend changes affected learner request patterns

**When to create new HAR files**:

* Frontend code changes that modify the pattern of HTTP requests during learner interactions
* New Kolibri version where request patterns have changed
* Adding new content types or interaction flows to test

**Selection**: ``run`` uses ``har_files/lesson_flow_kolibri_<server version>.har`` when it exists. Otherwise it falls back to the newest versioned HAR and logs a warning; static bundle URLs are rewritten to the server's version at replay time. Pass ``--har`` to choose a file explicitly. HAR files are stored with Git LFS.

**Versioning**: HAR files are named with the Kolibri version where they were captured
(e.g., ``lesson_flow_kolibri_0.18.4.har``). This version acts as a "valid from" marker -
the HAR can be used for that version and later versions until request patterns change.
Committed HAR files for released versions are preserved in version control.

Comparing builds with bench.py
------------------------------
``bench.py`` runs the load test against a baseline build and then each comparison build. Every run starts from a fresh copy of the same template ``KOLIBRI_HOME``, and results land in ``generated/results/<name>_<suffix>/``.

.. code-block:: bash

   python bench.py run --baseline base=release:0.19.4 fix=pr:14770 \
       --suffix r1 --username admin --password admin
   python loadtest.py compare base_r1 fix_r1

Targets are ``name=spec``:

* ``pr:<number>``: the PR's CI wheel, downloaded with an authenticated ``gh`` CLI
* ``release:<version>``: the wheel from PyPI, downloaded with ``pip`` (or ``uv tool run pip`` when only uv is installed)
* ``path/to/kolibri.whl``: a local wheel
* ``worktree:<path>``: a wheel built with ``make dist`` in that worktree
* ``dev:<path>``: an editable install of that worktree into the current environment; local runs only, and needs a current ``pnpm build``

The baseline must be the oldest version, since Kolibri cannot migrate a database backwards. The template is generated from the baseline by ``loadtest.py setup`` and cached under ``generated/templates/``; pass ``--regenerate-template`` to rebuild it.

Local runs need Linux: they use ``ss`` and GNU ``cp --reflink``.

Remote devices
~~~~~~~~~~~~~~
To run the servers on another device (e.g. a Raspberry Pi) while load comes from this machine:

1. Start the hub, which listens on port 8765 and prints a one-line install command:

   .. code-block:: bash

      python bench.py listen

2. On the device, run the printed command:

   .. code-block:: bash

      curl -sf -H 'X-Bench-Token: <token>' http://<host>:8765/agent.py | python3 -

   The agent needs Python 3.6+ with ``venv`` and ``pip``, and no other packages. It registers under its hostname, keeps state under ``~/.kolibri_bench/``, and reconnects whenever a hub restarts.

3. Pass the device's hostname to ``run``:

   .. code-block:: bash

      python bench.py devices
      python bench.py run --device pi4 --baseline base=release:0.19.4 fix=pr:14770 \
          --suffix r1 --username admin --password admin

The hub ships each wheel and the template to the device. ``dev:`` targets cannot run remotely. Use ``--hub-host`` if the address the hub prints is not reachable from the device.

Every hub request, including the ``agent.py`` download, needs the token stored in ``generated/hub_token``. Anyone holding it can make an agent install and run arbitrary code, so keep it private. The hub speaks plain HTTP, so use it on a trusted network only.
