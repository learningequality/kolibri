import uuid


def virtual_node_id(root_id, path):
    """Must match ``virtualNodeId`` in packages/kolibri/utils/virtualNodeId.js."""
    return uuid.uuid5(uuid.UUID(root_id), path).hex


def virtual_content_id(root_content_id, path):
    return uuid.uuid5(uuid.UUID(root_content_id), path).hex
