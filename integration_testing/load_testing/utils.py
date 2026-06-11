"""
Utility functions for load testing.
"""

import csv
import io
import json
import os

from le_utils.constants import content_kinds
from logger import info
from logger import plain
from logger import warning

# Path to saved lesson resources
LESSON_RESOURCES_PATH = os.path.join(os.path.dirname(__file__), "lesson_resources.json")

# Content requirements: one of each technical implementation type
CONTENT_REQUIREMENTS = {
    # Simple kinds (no sub-filtering needed)
    "video": {"kind": content_kinds.VIDEO},
    "audio": {"kind": content_kinds.AUDIO},
    "html5": {"kind": content_kinds.HTML5},
    "h5p": {"kind": content_kinds.H5P},
    # Document sub-types (by file extension)
    "document_pdf": {"kind": content_kinds.DOCUMENT, "file_extension": "pdf"},
    "document_epub": {"kind": content_kinds.DOCUMENT, "file_extension": "epub"},
    "document_bloompub": {"kind": content_kinds.DOCUMENT, "file_extension": "bloompub"},
    # Exercise sub-types (by options.modality)
    "exercise_regular": {
        "kind": content_kinds.EXERCISE,
        "modality": None,  # No modality field or empty
    },
    "exercise_quiz": {"kind": content_kinds.EXERCISE, "modality": "QUIZ"},
    "exercise_survey": {"kind": content_kinds.EXERCISE, "modality": "SURVEY"},
}


def generate_users_csv(num_users=50, classroom_name="Load Test Class"):
    """
    Generate CSV for bulk user import.

    Args:
        num_users: Number of users to generate (default: 50)
        classroom_name: Name of classroom to enroll users in

    Returns:
        str: CSV content
    """
    csv_data = io.StringIO()
    writer = csv.DictWriter(
        csv_data,
        fieldnames=[
            "UUID",
            "USERNAME",
            "PASSWORD",
            "FULL_NAME",
            "USER_TYPE",
            "IDENTIFIER",
            "BIRTH_YEAR",
            "GENDER",
            "ENROLLED_IN",
            "ASSIGNED_TO",
        ],
    )
    writer.writeheader()

    for i in range(1, num_users + 1):
        writer.writerow(
            {
                "UUID": "",  # Auto-generate
                "USERNAME": f"load_test_{i}",
                "PASSWORD": "password",
                "FULL_NAME": f"Load Test User {i}",
                "USER_TYPE": "LEARNER",
                "IDENTIFIER": "",
                "BIRTH_YEAR": "",
                "GENDER": "",
                "ENROLLED_IN": classroom_name,  # Classroom auto-created by import!
                "ASSIGNED_TO": "",
            }
        )

    csv_data.seek(0)
    return csv_data.getvalue()


def has_file_extension(node, extension):
    """
    Check if a content node has a file with the specified extension.

    Args:
        node: Content node dict (with 'files' field populated by API)
        extension: File extension to check for

    Returns:
        bool: True if node has file with this extension
    """
    files = node.get("files", [])
    return any(f.get("extension") == extension for f in files)


def get_node_by_criteria(client, channel_id, criteria):
    """
    Fetch content node matching specific criteria.

    Args:
        client: KolibriClient instance
        channel_id: Channel ID
        criteria: Dict with 'kind' and optional 'file_extension' or 'modality'

    Returns:
        dict or None: Matching content node
    """
    nodes = client.get_content_nodes(channel_id=channel_id, kind=criteria["kind"])

    if "file_extension" in criteria:
        # Filter by file extension
        target_ext = criteria["file_extension"]
        for node in nodes:
            # Check if node has file with matching extension
            if has_file_extension(node, target_ext):
                return node
        return None

    elif "modality" in criteria:
        # Filter by options.modality field
        target_modality = criteria["modality"]
        for node in nodes:
            modality = node.get("options", {}).get("modality")

            if target_modality is None:
                # Regular exercise: no modality
                if not modality:
                    return node
            elif modality == target_modality:
                return node
        return None

    else:
        # Simple kind-based query - return first match
        return nodes[0] if nodes else None


def generate_lesson_resources(client, channel_id):
    """
    Generate lesson resources list by searching for content matching requirements.

    Args:
        client: KolibriClient instance
        channel_id: Channel ID to search

    Returns:
        tuple: (resources list, missing_types list)
    """
    resources = []
    missing_types = []

    # Try to find one content node for each requirement
    for req_name, criteria in CONTENT_REQUIREMENTS.items():
        info(f"Looking for {req_name}...")
        node = get_node_by_criteria(client, channel_id, criteria)

        if node:
            resources.append(
                {
                    "contentnode_id": node["id"],
                    "content_id": node["content_id"],
                    "channel_id": channel_id,
                }
            )
            plain(f"✓ Found: {node.get('title', node['id'])}")
        else:
            missing_types.append(req_name)
            plain("✗ Not found")

    if not resources:
        raise Exception("No content found in channel")

    if missing_types:
        warning(f"Could not find content for: {', '.join(missing_types)}")

    return resources


def save_lesson_resources(resources):
    """
    Save lesson resources list to JSON file.

    Args:
        resources: List of resource dicts
    """
    with open(LESSON_RESOURCES_PATH, "w") as f:
        json.dump(resources, f, indent=2)


def load_lesson_resources():
    """
    Load lesson resources list from JSON file.

    Returns:
        list: Resources list, or None if file doesn't exist
    """
    if not os.path.exists(LESSON_RESOURCES_PATH):
        return None

    with open(LESSON_RESOURCES_PATH, "r") as f:
        return json.load(f)


def get_or_generate_lesson_resources(client, channel_id):
    """
    Load lesson resources from file, or generate and save if not found.

    Args:
        client: KolibriClient instance
        channel_id: Channel ID to search

    Returns:
        tuple: (resources list, missing_types list)
    """
    # Try to load existing resources
    resources = load_lesson_resources()

    if resources:
        info(f"Using saved lesson resources from: {LESSON_RESOURCES_PATH}")
        return resources

    # Generate new resources
    info("No saved resources found, generating from channel content...")
    resources = generate_lesson_resources(client, channel_id)

    # Save for future use
    save_lesson_resources(resources)
    info(f"Saved lesson resources to: {LESSON_RESOURCES_PATH}")

    return resources
