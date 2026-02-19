API Patterns
============

This document describes common patterns and best practices for building APIs in Kolibri.

ValuesViewset Pattern
---------------------

Overview
~~~~~~~~

``ValuesViewset`` is the **preferred pattern for all API endpoints in Kolibri** unless there's a compelling reason to use a standard DRF viewset. It uses Django's ``.values()`` queryset method to fetch only needed fields in a single database query, avoiding the overhead of model instantiation and providing better performance.

**Performance benefits:**

- **Avoids N+1 queries** when traversing foreign key lookups (which happens easily with DRF Serializers using method fields)
- **Reduces memory usage** for large querysets by not instantiating model objects that aren't needed for read operations
- Single database query with only needed fields (vs. fetching all model fields)
- Efficient handling of foreign key lookups using ``__`` notation

**When to use ValuesViewset (default):**

- Use ValuesViewset for **all API endpoints** as the standard pattern
- Works for both read and write operations (uses ModelSerializer for write operations)
- Particularly important for endpoints that traverse foreign key relationships
- Essential for list endpoints with many objects

**When a standard ModelViewSet might be needed:**

- Very rare - ValuesViewset should be the default choice
- Only if there's a specific technical limitation that requires standard DRF patterns
- Note: Complex nested serialization is **not** a reason to avoid ValuesViewset - it can actually prevent N+1 query issues

Basic Usage
~~~~~~~~~~~

A minimal ``ValuesViewset`` requires defining the ``values`` tuple:

.. code-block:: python

  from kolibri.core.api import ValuesViewset
  from kolibri.core.auth.api import KolibriAuthPermissions
  from .models import Lesson

  # Permissions are typically defined in the same file as the viewset
  class LessonPermissions(KolibriAuthPermissions):
      pass

  class LessonViewset(ValuesViewset):
      queryset = Lesson.objects.all()
      permission_classes = (LessonPermissions,)

      # Tuple of fields to fetch from database
      values = (
          "id",
          "title",
          "description",
          "is_active",
          "created_by",
          "date_created",
      )

Key Attributes and Methods
~~~~~~~~~~~~~~~~~~~~~~~~~~~

``values`` (required)
^^^^^^^^^^^^^^^^^^^^^

Tuple of database field names to fetch. Supports foreign key lookups using ``__`` notation:

.. code-block:: python

  values = (
      "id",
      "title",
      "collection__id",        # FK lookup: classroom ID
      "collection__name",      # FK lookup: classroom name
      "collection__parent_id", # FK lookup: facility ID
  )

``field_map`` (optional)
^^^^^^^^^^^^^^^^^^^^^^^^

Dictionary mapping API field names to database fields or transformation functions:

.. code-block:: python

  # Simple string mapping (rename fields)
  field_map = {
      "active": "is_active",              # API: active, DB: is_active
      "classroom_id": "collection__id",   # Rename FK field
  }

  # Callable mapping (transform data)
  def _transform_classroom(item):
      """Restructure classroom data from flat to nested"""
      return {
          "id": item.pop("collection__id"),
          "name": item.pop("collection__name"),
          "parent": item.pop("collection__parent_id"),
      }

  field_map = {
      "classroom": _transform_classroom,  # Returns nested object
  }

``annotate_queryset(queryset)`` (optional)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Method to add computed/aggregated fields before serialization:

.. code-block:: python

  from kolibri.core.query import annotate_array_aggregate

  class MyViewset(ValuesViewset):
      # ...

      def annotate_queryset(self, queryset):
          """Add aggregated learner IDs"""
          return annotate_array_aggregate(
              queryset,
              learner_ids="lesson_assignments__collection__membership__user_id"
          )

``consolidate(items, queryset)`` (optional)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Method to post-process the serialized items. Useful for adding related data that would be inefficient to fetch via ``values()`` (e.g., data that would cause complex subqueries worse for performance than a separate query).

**Important:** Use ``__in`` lookups on the IDs of the fetched items, not on the original queryset, for efficient batch fetching:

.. code-block:: python

  def consolidate(self, items, queryset):
      """Add related assignment data"""
      if items:
          # Extract IDs from the already-fetched items
          lesson_ids = [item["id"] for item in items]

          # Fetch related data in a separate efficient query using __in
          assignments = Assignment.objects.filter(
              lesson_id__in=lesson_ids
          ).select_related('collection')

          assignments_by_lesson = {
              a.lesson_id: a for a in assignments
          }

          for item in items:
              item["assignment"] = assignments_by_lesson.get(item["id"])
              item["resources"] = item.get("resources") or []

      return items

Complete Example
~~~~~~~~~~~~~~~~

.. code-block:: python

  from django_filters.rest_framework import DjangoFilterBackend
  from kolibri.core.api import ValuesViewset
  from kolibri.core.auth.api import KolibriAuthPermissions
  from kolibri.core.auth.api import KolibriAuthPermissionsFilter
  from kolibri.core.auth.constants.collection_kinds import ADHOCLEARNERSGROUP
  from kolibri.core.query import annotate_array_aggregate
  from .models import Lesson, LessonAssignment
  from .serializers import LessonSerializer


  class LessonPermissions(KolibriAuthPermissions):
      # Defined in the same file as the viewset (not a separate permissions module)
      pass


  def _map_lesson_classroom(item):
      """Transform flat classroom fields to nested object"""
      return {
          "id": item.pop("collection__id"),
          "name": item.pop("collection__name"),
          "parent": item.pop("collection__parent_id"),
      }


  class LessonViewset(ValuesViewset):
      serializer_class = LessonSerializer
      queryset = Lesson.objects.all().order_by("-date_created")
      permission_classes = (LessonPermissions,)
      filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
      filterset_fields = ("collection", "id")

      values = (
          "id",
          "title",
          "description",
          "resources",
          "is_active",
          "collection",           # Classroom FK (as ID, used for filtering)
          "collection__id",       # Classroom ID (used by _map_lesson_classroom)
          "collection__name",     # Classroom name (used by _map_lesson_classroom)
          "collection__parent_id",# Facility ID (used by _map_lesson_classroom)
          "created_by",
          "date_created",
      )

      field_map = {
          "active": "is_active",              # Rename field
          "classroom": _map_lesson_classroom, # Transform to nested object
      }

      def annotate_queryset(self, queryset):
          """Add aggregated assignment collections"""
          return annotate_array_aggregate(
              queryset,
              lesson_assignment_collections="lesson_assignments__collection"
          )

      def consolidate(self, items, queryset):
          """Add learner IDs for ad-hoc assignments"""
          if items:
              # Extract IDs from fetched items for efficient batch query
              lesson_ids = [item["id"] for item in items]

              adhoc_assignments = LessonAssignment.objects.filter(
                  lesson_id__in=lesson_ids,
                  collection__kind=ADHOCLEARNERSGROUP
              )
              adhoc_assignments = annotate_array_aggregate(
                  adhoc_assignments,
                  learner_ids="collection__membership__user_id"
              )
              adhoc_map = {
                  a["lesson"]: a
                  for a in adhoc_assignments.values("lesson", "learner_ids")
              }

              for item in items:
                  if item["id"] in adhoc_map:
                      item["learner_ids"] = adhoc_map[item["id"]]["learner_ids"]
                  else:
                      item["learner_ids"] = []

          return items

Viewset Variants
~~~~~~~~~~~~~~~~

Kolibri provides several ValuesViewset variants:

``BaseValuesViewset``
^^^^^^^^^^^^^^^^^^^^^

Base class with core functionality, no default actions. Extend this to create custom viewsets:

.. code-block:: python

  from kolibri.core.api import BaseValuesViewset

  class CustomViewset(BaseValuesViewset):
      # Add your own actions
      pass

``ReadOnlyValuesViewset``
^^^^^^^^^^^^^^^^^^^^^^^^^

Includes list and retrieve actions only:

.. code-block:: python

  from kolibri.core.api import ReadOnlyValuesViewset

  class ContentNodeViewset(ReadOnlyValuesViewset):
      # Read-only API
      pass

``ValuesViewset``
^^^^^^^^^^^^^^^^^

Full CRUD operations (Create, Retrieve, Update, Delete, List):

.. code-block:: python

  from kolibri.core.api import ValuesViewset

  class LessonViewset(ValuesViewset):
      # Full CRUD operations
      pass

Best Practices
~~~~~~~~~~~~~~

1. **Only fetch needed fields**: Keep the ``values`` tuple minimal. Don't fetch fields you won't use.

2. **Use field_map for clarity**: Rename fields in ``field_map`` rather than in templates/frontend to keep API consistent.

3. **Batch related queries in consolidate**: If you need related data, fetch it efficiently in ``consolidate`` using ``__in`` lookups on the IDs from already-fetched items.

4. **Use annotate_queryset for aggregations**: Add computed fields via ``annotate_queryset`` rather than post-processing.

5. **Keep transformations simple**: Complex transformations in ``field_map`` callables can negate performance benefits.

6. **Test query performance**: Use Django Silk to profile your endpoints and verify query counts, execution time, and identify N+1 query issues. This is essential for ensuring your ValuesViewset implementation is actually performant.

Common Pitfalls
~~~~~~~~~~~~~~~

**Forgetting to include FK fields in values**

.. code-block:: python

  # Wrong: field_map references collection__name but it's not in values
  values = ("id", "title")
  field_map = {"classroom": lambda x: x.pop("collection__name")}  # KeyError!

  # Correct: include all referenced fields
  values = ("id", "title", "collection__name")
  field_map = {"classroom": lambda x: x.pop("collection__name")}

**Modifying items without returning them in consolidate**

.. code-block:: python

  # Wrong: doesn't return items
  def consolidate(self, items, queryset):
      for item in items:
          item["foo"] = "bar"
      # Missing return!

  # Correct: always return items
  def consolidate(self, items, queryset):
      for item in items:
          item["foo"] = "bar"
      return items

**Using pop() in field_map callables without checking existence**

.. code-block:: python

  # Wrong: KeyError if field doesn't exist
  field_map = {"classroom": lambda x: x.pop("collection__name")}

  # Better: check existence
  def _map_classroom(item):
      return item.pop("collection__name", None)

  field_map = {"classroom": _map_classroom}

Related Documentation
~~~~~~~~~~~~~~~~~~~~~

- :doc:`testing` - Testing ValuesViewset endpoints
- `Django Querysets <https://docs.djangoproject.com/en/stable/ref/models/querysets/>`__
- `Django values() <https://docs.djangoproject.com/en/stable/ref/models/querysets/#values>`__
