Troubleshooting
----------------

#### Getting logs

App logs can be found in the `logs` subdirectory of the app's Kolibri home folder,
which is the default Kolibri home directory for installed apps, and a `KOLIBRI_DATA`
folder alongside the app for portable apps.

#### Packaging: Modules not being found

The most common issue with building and packaging the app on various platforms is that
some Python module the app is importing doesn't get detected and bundled into the app.

These detection errors often happen due to the fact that you can dynamically import
code in ways that static code analyzers fail to detect.

There's a couple ways to fix this, depending on the scenario.

_Fix #1: Add to "includes" or "packages" in `project_info.json`_

Most commonly, this will be the way to solve the problem.

`includes` is used for Python standard library modules that got missed. The need to use
this should be pretty rare, now that we try to bundle the entire Python standard library
into the app.

`packages` are for third-party modules, and bundles the entire module, rather than just
the parts of it the app is determined to use.

Adding to `packages` can also solve the case where a submodule is missing.

_Fix #2: Import the missing module in `src/main.py`_

This should not be needed often, but sometimes the module gets missed because it somehow doesn't
get found when imported from a submodule, and importing it in the entry point resolves the issue.

_Fix #3: (Android) Add a `recipe` to `requirements` in `project_info.json`_

When doing this, you need to use the recipe name rather than the module or `pypi` name for
the project. The list of recipe names to choose from [can be found here](https://github.com/kollivier/python-for-android/tree/pew_webview/pythonforandroid/recipes).
Check the Android section of the architecture docs for a more detailed explanation of why this
is needed.
