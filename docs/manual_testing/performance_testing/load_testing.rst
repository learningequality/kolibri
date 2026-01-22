
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

**Versioning**: HAR files are named with the Kolibri version where they were captured
(e.g., ``lesson_flow_kolibri_0.18.4.har``). This version acts as a "valid from" marker -
the HAR can be used for that version and later versions until request patterns change.
Committed HAR files for released versions are preserved in version control.
