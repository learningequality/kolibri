"""
Update Master Language File from Inno Setup Defaults.

This script is designed to synchronize the project's master
language file (`English.isl`) with an updated `Default.isl`
from a new version of the Inno Setup compiler.

Workflow:
1.  Compares the `[Messages]` section of the new `Default.isl` with the
    project's current `English.isl`.
2.  Identifies and calculates the differences: strings that have been added,
    removed, or modified between the two versions.
3.  Merges these changes into the project's `English.isl`,
    updating the base translations while preserving the project-specific
    `[CustomMessages]` and `[LangOptions]` sections.
4.  Generates a `update_report.txt` file that lists all changes.
    This report serves as a guide for translators to update the
    other language files accordingly.
"""
import argparse
import configparser
import os
from datetime import datetime
from datetime import timezone


def _load_config(file_path):
    """Loads an ISL file into a ConfigParser object."""
    config = configparser.ConfigParser(
        allow_no_value=True, interpolation=None, strict=False
    )
    config.optionxform = str  # Preserve case
    config.read(file_path, encoding="utf-8-sig")
    return config


def _compare_messages(new_messages, master_messages):
    """Compares two dictionaries of messages and returns the differences."""
    added = {k: v for k, v in new_messages.items() if k not in master_messages}
    removed = {k: v for k, v in master_messages.items() if k not in new_messages}
    modified = {
        k: {"old": master_messages[k], "new": v}
        for k, v in new_messages.items()
        if k in master_messages and master_messages[k] != v
    }
    return added, removed, modified


def _generate_report(report_path, added, removed, modified):
    """Writes the comparison results to a text file."""
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(
            f"Inno Setup String Update Report - {datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z')}\n\n"
        )
        f.write("=" * 50 + "\n\n")

        if not any([added, removed, modified]):
            f.write(
                "No changes detected between the new Default.isl and the project master.\n"
            )
            return

        if added:
            f.write("--- ADDED STRINGS ---\n")
            for key, value in added.items():
                f.write(f"{key}={value}\n")
            f.write("\n")

        if removed:
            f.write("--- REMOVED STRINGS ---\n")
            for key, value in removed.items():
                f.write(f"{key}={value}\n")
            f.write("\n")

        if modified:
            f.write("--- MODIFIED STRINGS ---\n")
            for key, values in modified.items():
                f.write(f"{key}\n")
                f.write(f"  - OLD: {values['old']}\n")
                f.write(f"  + NEW: {values['new']}\n")
            f.write("\n")
    print(f"Update report generated: {report_path}")


def update_master_from_default(new_default_path, project_master_path):
    """
    Compares a new Inno Setup Default.isl with the project's master English.isl,
    merges changes, and generates a report.
    """
    if not os.path.exists(new_default_path):
        print(f"Error: New default file not found at {new_default_path}")
        return

    if not os.path.exists(project_master_path):
        print(f"Error: Project master file not found at {project_master_path}")
        return

    # 1. Load configuration files
    new_config = _load_config(new_default_path)
    master_config = _load_config(project_master_path)

    # 2. Perform comparison
    new_messages = dict(new_config["Messages"])
    master_messages = dict(master_config["Messages"])
    added, removed, modified = _compare_messages(new_messages, master_messages)

    # 3. Merge the configurations
    final_config = configparser.ConfigParser(
        allow_no_value=True, interpolation=None, strict=False
    )
    final_config.optionxform = str  # Preserve case
    final_config.read_dict(new_config)
    if "CustomMessages" in master_config:
        final_config["CustomMessages"] = master_config["CustomMessages"]
    if "LangOptions" in master_config:
        final_config["LangOptions"] = master_config["LangOptions"]

    # 4. Write the updated master file
    with open(project_master_path, "w", encoding="utf-8") as f:
        f.write("; Master English messages for Kolibri Installer\n")
        f.write(
            f"; Last updated: {datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z')}\n\n"
        )
        final_config.write(f, space_around_delimiters=False)
    print(f"Successfully updated master file: {project_master_path}")

    # 5. Generate the update report
    _generate_report("update_report.txt", added, removed, modified)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Update the project's master Inno Setup language file from a new Default.isl."
    )
    parser.add_argument(
        "--new-default",
        required=True,
        help="Path to the Default.isl from the new Inno Setup installation.",
    )
    parser.add_argument(
        "--project-master",
        required=True,
        help="Path to the project's master English.isl file to be updated.",
    )
    args = parser.parse_args()

    update_master_from_default(args.new_default, args.project_master)
