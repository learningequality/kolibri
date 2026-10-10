---
name: jupyter-notebook
description: >-
  Use whenever the user works with Jupyter notebooks (`.ipynb`), including
  creating, inspecting, editing, executing, or visualizing notebook content for
  experiments, explorations, or tutorials.
license: MIT
metadata:
  category: development
  author: Kilo
  suggest_for:
    filename:
      - '*.ipynb'
    vscode_extension:
      - name: Jupyter
        id: ms-toolsai.jupyter
  source:
    repository: 'https://github.com/Kilo-Org/skills'
    path: skills/jupyter-notebook
    license_path: LICENSE
---

# Jupyter Notebook Skill

Create clean, reproducible Jupyter notebooks for two primary modes:

- Experiments and exploratory analysis
- Tutorials and teaching-oriented walkthroughs

Prefer the bundled templates and the helper script for consistent structure and fewer JSON mistakes.

## When to use
- Create a new `.ipynb` notebook from scratch.
- Inspect notebook cells, outputs, metadata, dependencies, or execution state.
- Add, remove, reorder, or edit code and Markdown cells.
- Execute notebooks, refresh saved outputs, or troubleshoot kernel failures.
- Create or improve notebook tables, charts, and other visualizations.
- Convert rough notes or scripts into a structured notebook.
- Refactor an existing notebook to be more reproducible and skimmable.
- Build experiments or tutorials that will be read or re-run by other people.

## Decision tree
- If the request is exploratory, analytical, or hypothesis-driven, choose `experiment`.
- If the request is instructional, step-by-step, or audience-specific, choose `tutorial`.
- If editing an existing notebook, treat it as a refactor: preserve intent and improve structure.

## Choose the notebook tooling

Before inspecting, editing, or executing a notebook, check whether suitable Jupyter MCP tools are available.

- Prefer a connected Jupyter MCP server for notebook operations.
- If Jupyter MCP is unavailable or an MCP operation fails, explicitly tell the user that you are switching to manual notebook editing.
- Follow `references/manual-editing.md` before editing raw notebook JSON.
- Do not use MCP and manual JSON editing simultaneously for the same change.

## Workflow
1. Lock the intent.
Identify the notebook kind: `experiment` or `tutorial`.
Capture the objective, audience, and what "done" looks like.

2. Scaffold from the template.
Use the helper script to avoid hand-authoring raw notebook JSON. Resolve `scripts/new_notebook.py` against the base directory supplied when this skill is loaded; do not assume the skill is installed under the project's `.kilo` directory.

```bash
python3 "<SKILL_BASE_DIR>/scripts/new_notebook.py" \
  --kind experiment \
  --title "Compare prompt variants" \
  --out "compare-prompt-variants.ipynb"
```

```bash
python3 "<SKILL_BASE_DIR>/scripts/new_notebook.py" \
  --kind tutorial \
  --title "Intro to embeddings" \
  --out "intro-to-embeddings.ipynb"
```

3. Fill the notebook with small, runnable steps.
Keep each code cell focused on one step.
Add short markdown cells that explain the purpose and expected result.
Avoid large, noisy outputs when a short summary works.

4. Apply the right pattern.
For experiments, follow `references/experiment-patterns.md`.
For tutorials, follow `references/tutorial-patterns.md`.

5. Edit safely when working with existing notebooks.
Preserve the notebook structure; avoid reordering cells unless it improves the top-to-bottom story.
Prefer targeted edits over full rewrites.
If you must edit raw JSON, follow `references/manual-editing.md`.

6. Validate the result.
Run the notebook top-to-bottom when the environment allows.
If execution is not possible, say so explicitly and call out how to validate locally.
Use the final pass checklist in `references/quality-checklist.md`.

## Templates and helper script
- Templates live in `assets/experiment-template.ipynb` and `assets/tutorial-template.ipynb`.
- The helper script loads a template, updates the title cell, and writes a notebook.

## Temp and output conventions
- Use the system temporary directory for intermediate files and delete them when done.
- Save the final notebook in the user-requested location, or in the current project directory when no location is specified.
- Use stable, descriptive filenames (for example, `ablation-temperature.ipynb`).

## Dependencies (install only when needed)

Optional Python packages for local notebook execution:

```bash
python3 -m pip install jupyterlab ipykernel
```

The bundled scaffold script uses only the Python standard library and does not require extra dependencies.

## Environment
No required environment variables.

## Reference map
- `references/experiment-patterns.md`: experiment structure and heuristics.
- `references/tutorial-patterns.md`: tutorial structure and teaching flow.
- `references/notebook-structure.md`: notebook JSON shape.
- `references/manual-editing.md`: manual editing and execution fallback when Jupyter MCP is unavailable.
- `references/quality-checklist.md`: final validation checklist.
