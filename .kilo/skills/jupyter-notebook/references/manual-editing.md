# Manual Notebook Editing And Execution

Use this fallback only when no suitable Jupyter MCP connection is available or the MCP operation fails. Tell the user that manual notebook tooling is being used because MCP is unavailable.

## Tool And Dependency Checks

Check only what the requested operation needs. Do not install packages silently.

```bash
# Required for scaffolding and raw JSON editing
python3 --version

# Required only for local notebook execution
command -v jupyter
jupyter --version
jupyter kernelspec list
```

The shell's `python3` may differ from the selected notebook kernel. For package checks, prefer the interpreter backing that kernel. Inspect kernel specifications when needed:

```bash
jupyter kernelspec list --json
```

If a requirement is missing:

- Continue work that does not require it.
- Explain which operation is blocked and which command or package is missing.
- Ask the user to install system-level tools unless installation was explicitly requested.
- Prefer a project virtual environment over global package installation.
- Do not install optional packages until the requested notebook uses them.

Typical macOS commands are:

```bash
brew install jupyterlab
python3 -m pip install pandas matplotlib
```

After installation, repeat the checks and ensure the selected kernel uses the environment where packages were installed.

## New Notebook Scaffolding

Use the bundled standard-library helper for a new notebook. Resolve its relative path against the base directory supplied when the skill is loaded; do not assume a project-local or global installation location.

```bash
python3 "<SKILL_BASE_DIR>/scripts/new_notebook.py" \
  --kind experiment \
  --title "Compare housing variables" \
  --out "housing-analysis.ipynb"
```

Use `--kind tutorial` for teaching material. The helper refuses to overwrite an existing file unless `--force` is passed. Use `--force` only when replacement was explicitly requested.

Templates relative to the skill base directory are:

- `assets/experiment-template.ipynb`
- `assets/tutorial-template.ipynb`

The helper uses only Python's standard library, updates the title, generates fresh cell IDs, and writes valid notebook JSON. Use templates only for new notebooks.

## Local Execution

To execute every code cell and save outputs into the same notebook:

```bash
jupyter nbconvert --to notebook --execute --inplace "notebook.ipynb"
```

This changes execution counts and outputs across all code cells. Use it only when the user asks to run the notebook or refresh results.

After execution:

- Check the command exit status.
- Verify expected outputs and inspect saved cell errors.
- Report relevant outputs concisely.
- Do not claim the notebook ran if code was merely executed separately with `python3`.

If `jupyter` is unavailable, identify execution as blocked and provide the appropriate installation command.

## Data And Visualizations

For CSV exploration:

- Resolve data paths relative to the notebook's working directory.
- Prefer already-installed packages.
- Use `pandas` and `matplotlib` when available and appropriate.
- Preview the data and dimensions before plotting.
- Choose a few meaningful visuals instead of plotting every column.
- Add short Markdown explanations around charts.
- Use readable titles, labels, figure sizes, and restrained colors.
- Call `plt.show()` so figures are rendered and saved during execution.

Before importing a package in generated cells, verify that it is available to the selected notebook kernel, not merely to the shell's default Python.

## Core Rule

An `.ipynb` file is JSON. Edit the notebook data model, never a rendered approximation such as `<code_cell>` or `<markdown_cell>` tags.

Some file-reading tools render notebooks as simplified cells instead of showing their literal bytes. Do not infer that the file is invalid from that rendering. Read exact on-disk content as plain text:

```bash
python3 -c 'from pathlib import Path; print(Path("notebook.ipynb").read_text(), end="")'
```

Before every edit, inspect the current on-disk JSON so concurrent user changes are not overwritten.

## Limitations

Raw JSON editing does not require a Jupyter server, MCP connection, or active kernel. However:

- Keep the JSON syntactically valid.
- Cell `source` is usually an array of strings with explicit newline characters.
- Editing `outputs` changes only saved output, not kernel state.
- Editing `kernelspec` records a preference; it does not install or start that kernel.
- Do not edit the notebook UI and raw JSON simultaneously because one editor may overwrite the other's changes.
- Avoid direct editing while a remote server or another user is modifying the notebook.

## Notebook Structure

A valid notebook has this general shape:

```json
{
  "cells": [],
  "metadata": {
    "kernelspec": {
      "display_name": "Python 3",
      "language": "python",
      "name": "python3"
    }
  },
  "nbformat": 4,
  "nbformat_minor": 5
}
```

A code cell requires:

```json
{
  "cell_type": "code",
  "execution_count": null,
  "id": "unique-id",
  "metadata": {},
  "outputs": [],
  "source": [
    "print(3 + 3)"
  ]
}
```

A Markdown cell requires:

```json
{
  "cell_type": "markdown",
  "id": "unique-id",
  "metadata": {},
  "source": [
    "# Heading"
  ]
}
```

Use a unique short hexadecimal ID for a new cell, for example `secrets.token_hex(4)`. Preserve existing cell IDs.

## Safe Editing Workflow

1. Locate the intended notebook if the user did not provide its path.
2. Read its literal JSON immediately before editing.
3. Parse it with Python's standard `json` module.
4. Modify only the requested cell or position in `data["cells"]`.
5. Preserve every unrelated cell, output, execution count, metadata field, and unknown field.
6. Serialize valid JSON with a trailing newline.
7. Validate the result with `python3 -m json.tool`.
8. If execution was requested, execute only after the edit validates.

Prefer a small Python transformation over rewriting the full notebook by hand:

```bash
python3 -c '
import json, secrets
from pathlib import Path

path = Path("notebook.ipynb")
data = json.loads(path.read_text())
data["cells"].insert(2, {
    "cell_type": "code",
    "execution_count": None,
    "id": secrets.token_hex(4),
    "metadata": {},
    "outputs": [],
    "source": ["print(\"Middle\")"]
})
path.write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n")
'
python3 -m json.tool "notebook.ipynb" >/dev/null
```

Treat references to "block 2" or "cell 2" as one-based unless context clearly indicates otherwise. Inspect neighboring cells before inserting.

## Editing Existing Code

When adding a line to an existing code cell:

- Change only that cell's `source` array.
- Include `\n` between source lines so they remain separate statements.
- Keep existing saved outputs unless the user asks to clear them or requests execution.
- Warn that saved output is stale until the cell or notebook runs.

Example:

```json
"source": [
  "print(8 + 8)\n",
  "print(6 + 6)"
]
```

## Preservation And Concurrency

Notebook editors can save changes while the agent is working. Re-read the file immediately before transformation. Never overwrite the notebook using stale content captured earlier.

Do not:

- Replace notebook JSON with pseudo-XML cell tags.
- Reconstruct all cells when a targeted JSON mutation is enough.
- Delete saved outputs, metadata, or IDs unless requested.
- Renumber execution counts manually.
- Invent rendered outputs; run the notebook to generate them.
- Use a notebook-aware rendered file view as proof of literal on-disk syntax.

## Validation

For an edit-only request:

```bash
python3 -m json.tool "notebook.ipynb" >/dev/null
```

For an execution request, also inspect code-cell errors:

```bash
python3 -c '
import json
from pathlib import Path

data = json.loads(Path("notebook.ipynb").read_text())
errors = [
    output
    for cell in data["cells"]
    for output in cell.get("outputs", [])
    if output.get("output_type") == "error"
]
if errors:
    raise SystemExit("Notebook contains execution errors")
print("Notebook executed without saved errors")
'
```

Report what cells changed, whether JSON validation passed, whether execution occurred, and whether outputs were saved.
