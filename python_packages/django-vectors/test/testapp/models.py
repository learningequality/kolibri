"""
Fixture models for the test suite. The router puts all of them on the `vectors`
alias.
"""

import uuid

from django.db import models

CHUNK_KINDS = (
    ("text", "Text"),
    ("image", "Image"),
)


class ChunkVector(models.Model):
    """A model that stores one embedding for each chunk."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    # The embedding, serialized as bytes.
    embedding = models.BinaryField()
    # The ID of the channel that the chunk comes from, as a 32-character hex
    # string.
    channel_id = models.CharField(max_length=32)
    # The type of content in the chunk.
    kind = models.CharField(max_length=16, choices=CHUNK_KINDS)

    class Meta:
        db_table = "vec_chunk"


class Document(models.Model):
    """A document that links to many chunk vectors through DocumentChunkVector."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)


class Chunk(models.Model):
    """A chunk of content and its metadata. Its embedding is in ChunkVector."""

    # The ID of a content node in another database. A foreign key cannot cross
    # databases, so this is a plain UUID.
    content_node_id = models.UUIDField(db_index=True)
    text = models.TextField()
    ordinal = models.PositiveIntegerField()
    # A chunk can exist before its embedding, so the relation is nullable. It has
    # no database constraint and no reverse accessor.
    vector = models.ForeignKey(
        ChunkVector,
        null=True,
        on_delete=models.DO_NOTHING,
        db_constraint=False,
        related_name="+",
    )

    class Meta:
        ordering = ("content_node_id", "ordinal")


class DocumentChunkVector(models.Model):
    """Each row links one document to one chunk vector."""

    document = models.ForeignKey(Document, on_delete=models.CASCADE)
    # This relation has the same shape as Chunk.vector.
    vector = models.ForeignKey(
        ChunkVector,
        null=True,
        on_delete=models.DO_NOTHING,
        db_constraint=False,
        related_name="+",
    )
