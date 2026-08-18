API Patterns
============

This document describes common patterns and best practices for building APIs in Kolibri.

ValuesViewset Pattern
---------------------

Overview
~~~~~~~~

``ValuesViewset`` is the **preferred pattern for all API endpoints in Kolibri** unless there's a compelling reason to use a standard DRF viewset. It uses Django's ``.values()`` queryset method to fetch only needed fields in a single database query, avoiding the overhead of model instantiation and providing better performance.

Performance benefits
^^^^^^^^^^^^^^^^^^^^

- **Avoids N+1 queries** when traversing foreign key lookups (which happens easily with DRF Serializers using method fields)
- **Reduces memory usage** for large querysets by not instantiating model objects that aren't needed for read operations
- Single database query with only needed fields (vs. fetching all model fields)
- Efficient handling of foreign key lookups using ``__`` notation

When to use ValuesViewset (default)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

- Use ValuesViewset for **all API endpoints** as the standard pattern
- Works for both read and write operations (uses ModelSerializer for write operations)
- Particularly important for endpoints that traverse foreign key relationships
- Essential for list endpoints with many objects

When a standard ModelViewSet might be needed
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

- Very rare - ValuesViewset should be the default choice
- Only if there's a specific technical limitation that requires standard DRF patterns
- Note: Complex nested serialization is **not** a reason to avoid ValuesViewset - it can actually prevent N+1 query issues

Basic Usage
~~~~~~~~~~~

Define a DRF serializer as the single source of truth for the API shape. The viewset automatically derives the ``values()`` query and field transformations from the serializer's field definitions:

.. code-block:: python

  from rest_framework import serializers
  from kolibri.core.api import ValuesViewset
  from kolibri.core.auth.api import KolibriAuthPermissions
  from .models import Lesson

  class LessonSerializer(serializers.ModelSerializer):
      class Meta:
          model = Lesson
          fields = ("id", "title", "description", "is_active", "created_by", "date_created")

  class LessonViewset(ValuesViewset):
      serializer_class = LessonSerializer
      queryset = Lesson.objects.all()
      permission_classes = (KolibriAuthPermissions,)

From this, the viewset automatically derives:

- **values tuple**: ``("id", "title", "description", "is_active", "created_by", "date_created")``
- **field transformations**: Each field's ``to_representation()`` method handles type coercion where needed

The model should define a default ``ordering`` in its ``Meta``, or the viewset's ``queryset`` should set an explicit ``order_by()`` — response ordering (and pagination) is nondeterministic otherwise.

How Derivation Works
~~~~~~~~~~~~~~~~~~~~

The viewset introspects the serializer's fields to build the values tuple and field mappings. The rules are:

.. list-table::
   :header-rows: 1
   :widths: 40 60

   * - Serializer Pattern
     - Derived Behavior
   * - ``field = CharField()``
     - Add ``'field'`` to values
   * - ``field = CharField(source='other')``
     - Add ``'other'`` to values, rename to ``'field'`` in output
   * - ``field = BooleanField(source='x.y')``
     - Add ``'x__y'`` to values, ``field.to_representation()`` handles coercion
   * - ``field = CharField(write_only=True)``
     - Skip (not in read output)
   * - ``nested = NestedSerializer(many=True)``
     - List of child dicts per parent
   * - ``nested = NestedSerializer()``
     - Nested dict, or ``None`` when there is no related row. Over a reverse FK or M2M the first child is rendered and the rest dropped - note that this is not supported behaviour in regular DRF, but is a useful enhancement that we have included for own usage.
   * - Custom field with ``to_representation()``
     - Custom transformation applied automatically
   * - ``field = ValuesMethodField(sources=(...))``
     - Add declared sources to values; invoke ``get_<field>`` per row over a proxy of those sources
   * - ``field = SerializerMethodField()``
     - Rejected at viewset init — use ``ValuesMethodField`` so sources are explicit

Computed and Derived Fields
~~~~~~~~~~~~~~~~~~~~~~~~~~~

When an output value isn't a direct column read, the table below covers the common shapes. ``ValuesMethodField`` is fine as the default for one-off per-row computation; promote to a custom ``Field`` subclass only when the same transform recurs across serializers.

.. list-table::
   :header-rows: 1
   :widths: 50 50

   * - Intent
     - Do this
   * - Expose a (possibly null) related attribute
     - ``BooleanField(source="dataset.x", default=False)``
   * - Constant value
     - ``ReadOnlyField(default=...)``
   * - M2M PK collection
     - Nested ``many=True`` serializer, or ``ArrayAgg`` annotation
   * - Count/aggregate over relation
     - ``annotate_queryset``
   * - Per-row transform or computation (one-off)
     - ``ValuesMethodField(sources=(...))``
   * - Per-row transform reused across serializers
     - Custom ``Field`` subclass with ``to_representation`` (e.g. ``SplitTextField``)
   * - Per-row computation that needs request context
     - ``ValuesMethodField(sources=(...))`` + ``self.context["request"]``

ValuesMethodField
^^^^^^^^^^^^^^^^^

A plain ``SerializerMethodField`` is rejected at viewset init — the viewset cannot infer which columns the method reads. Declare them with ``ValuesMethodField(sources=(...))``:

.. code-block:: python

  from kolibri.core.api import ValuesMethodField

  class UserSerializer(serializers.ModelSerializer):
      contact_label = ValuesMethodField(sources=("full_name", "email"))

      def get_contact_label(self, row):
          return "{} <{}>".format(row.full_name, row.email)

- ``sources`` are added to the ``values()`` call. Dotted sources (``"publisher.name"``) are walked: ``row.publisher.name`` reads the ``publisher__name`` column.
- ``row`` is a proxy exposing only the declared paths; anything else raises ``AttributeError``.
- Values are Python types after Django's coercion, not serialized strings — a ``DateTimeField`` source is a ``datetime``.
- Sources referenced *only* by the method are stripped from the output — method inputs, not outputs.
- ``self.context`` carries per-request state (``request``, ``view``, ``format``) for the duration of each ``serialize()`` call.

Nested Serializers
~~~~~~~~~~~~~~~~~~

Every nested serializer relation — forward FK, OneToOne either direction, reverse FK, M2M — is fetched automatically in a follow-up query and assembled onto its parents. So is a field whose source crosses a to-many relation (e.g. ``books.title``).

.. code-block:: python

  class PublisherSerializer(serializers.ModelSerializer):
      class Meta:
          model = Publisher
          fields = ("id", "name")

  class BookSerializer(serializers.ModelSerializer):
      publisher = PublisherSerializer(read_only=True)

      class Meta:
          model = Book
          fields = ("id", "title", "publisher")

The viewset fetches ``("id", "title", "publisher_id")``, then one ``Publisher.objects.filter(pk__in=...)`` over the distinct publisher ids. A null FK yields ``None``.

Custom fetch logic with deferred_fields
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Listing a field in ``deferred_fields`` opts it out of the automatic fetch — do that when the fetch needs annotations, filtering, or other custom logic, then build the field yourself in ``consolidate()``:

.. code-block:: python

  class FileSerializer(serializers.ModelSerializer):
      class Meta:
          model = File
          fields = ("id", "filename", "file_size")

  class ContentNodeSerializer(serializers.ModelSerializer):
      files = FileSerializer(many=True, read_only=True)
      tags = TagSerializer(many=True, read_only=True)

      class Meta:
          model = ContentNode
          fields = ("id", "title", "kind", "files", "tags")

  class ContentNodeViewSet(ReadOnlyValuesViewset):
      serializer_class = ContentNodeSerializer
      queryset = ContentNode.objects.all()
      deferred_fields = ("files", "tags")

      def consolidate(self, items, queryset):
          if not items:
              return items

          node_ids = [item["id"] for item in items]

          files_map = self.serialize_queryset(
              File.objects.filter(contentnode_id__in=node_ids),
              "files",
              group_by="contentnode_id",
          )

          tags_map = self.serialize_queryset(
              ContentTag.objects.filter(tagged_content_id__in=node_ids),
              "tags",
              group_by="tagged_content_id",
          )

          for item in items:
              item["files"] = files_map.get(item["id"], [])
              item["tags"] = tags_map.get(item["id"], [])

          return items

``serialize_queryset()`` serializes with the nested serializer's fields. ``group_by`` returns ``{key: [items]}``.

Things to watch
^^^^^^^^^^^^^^^

- A nested list's order comes from its own query, so give the child model an ``ordering`` in its ``Meta`` — ordering the parent queryset across the relation no longer reaches it.
- ``?ordering=`` takes the FK column (``?ordering=publisher``), not the child columns a join exposed (``?ordering=publisher__name``).
- DRF's ``OrderingFilter`` drops unrecognized terms without erroring, so a client sending the old form silently gets the default ordering.
- A forward FK resolves through the target's ``_base_manager`` with no filter backend, so a nested serializer will not hide a target.
- Reverse-FK, M2M and to-many fetches filter by parent pks, so they inherit the parent queryset's scope.

Dev-Mode Validation
~~~~~~~~~~~~~~~~~~~~

When ``DEBUG=True``, ``serialize()`` validates that the output matches the serializer contract after ``consolidate()`` runs. This catches:

- Missing fields (field in serializer but not in output)
- Extra fields (field in output but not in serializer)
- Nested field mismatches

This validation only runs in development and has no production overhead. If your ``consolidate()`` modifies the output shape, the serializer must declare all output fields.

Complete Example
~~~~~~~~~~~~~~~~

.. code-block:: python

  from rest_framework import serializers
  from django_filters.rest_framework import DjangoFilterBackend
  from kolibri.core.api import ValuesViewset
  from kolibri.core.auth.api import KolibriAuthPermissions
  from kolibri.core.auth.api import KolibriAuthPermissionsFilter
  from kolibri.core.auth.constants.collection_kinds import ADHOCLEARNERSGROUP
  from kolibri.core.query import annotate_array_aggregate
  from .models import Lesson, LessonAssignment


  class ClassroomSerializer(serializers.ModelSerializer):
      class Meta:
          model = Classroom
          fields = ("id", "name", "parent_id")


  class LessonSerializer(serializers.ModelSerializer):
      active = serializers.BooleanField(source="is_active")
      classroom = ClassroomSerializer(source="collection", read_only=True)
      learner_ids = serializers.ListField(read_only=True)
      lesson_assignment_collections = serializers.ListField(read_only=True)

      class Meta:
          model = Lesson
          fields = (
              "id", "title", "description", "resources",
              "active", "classroom",
              "created_by", "date_created",
              "learner_ids", "lesson_assignment_collections",
          )


  class LessonViewset(ValuesViewset):
      serializer_class = LessonSerializer
      queryset = Lesson.objects.all().order_by("-date_created")
      permission_classes = (KolibriAuthPermissions,)
      filter_backends = (KolibriAuthPermissionsFilter, DjangoFilterBackend)
      filterset_fields = ("collection", "id")
      deferred_fields = ("classroom",)

      def annotate_queryset(self, queryset):
          """Add aggregated assignment collections"""
          return annotate_array_aggregate(
              queryset,
              lesson_assignment_collections="lesson_assignments__collection"
          )

      def consolidate(self, items, queryset):
          """Add classroom data and learner IDs for ad-hoc assignments"""
          if not items:
              return items

          lesson_ids = [item["id"] for item in items]

          # Use serialize_queryset for deferred nested data
          classroom_map = self.serialize_queryset(
              Classroom.objects.filter(lesson__id__in=lesson_ids),
              "classroom",
              group_by="id",
          )

          adhoc_assignments = LessonAssignment.objects.filter(
              lesson_id__in=lesson_ids,
              collection__kind=ADHOCLEARNERSGROUP,
          )
          adhoc_assignments = annotate_array_aggregate(
              adhoc_assignments,
              learner_ids="collection__membership__user_id",
          )
          adhoc_map = {
              a["lesson"]: a
              for a in adhoc_assignments.values("lesson", "learner_ids")
          }

          for item in items:
              item["classroom"] = classroom_map.get(item["collection"], [None])[0]
              item["learner_ids"] = adhoc_map.get(item["id"], {}).get("learner_ids", [])

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

1. **Serializer as source of truth**: Define the API shape in the serializer. Don't duplicate field definitions between serializer and viewset.

2. **Use source for renames**: Use ``source`` on serializer fields rather than ``field_map`` for renaming.

3. **Rely on auto-deferral for relations**: Use explicit ``deferred_fields`` only when you need ORM annotations or custom filtering in ``consolidate()``.

4. **Batch related queries in consolidate**: Fetch deferred data efficiently using ``serialize_queryset()`` with ``group_by`` and ``__in`` lookups on IDs from already-fetched items.

5. **Use annotate_queryset for aggregations**: Add computed fields via ``annotate_queryset`` rather than post-processing.

6. **Test query performance**: Use Django Silk to profile your endpoints and verify query counts, execution time, and identify N+1 query issues.

Common Pitfalls
~~~~~~~~~~~~~~~

Forgetting to return items from consolidate
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

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

Migrating from Explicit Values
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Existing viewsets that use explicit ``values`` tuples and ``field_map`` dicts continue to work. To migrate to the serializer-derived pattern:

1. **Ensure API tests exist** for the viewset. Write them if missing — they must pass before and after migration.

2. **Capture a performance baseline** before making any changes. The benchmark script measures serialization timing, memory usage, and query count:

   .. code-block:: bash

     python integration_testing/scripts/viewset_serialization_benchmark.py \
         kolibri.core.auth.api.FacilityUserViewSet \
         -o baseline.json

   This saves timing, memory, query count, and a data hash to ``baseline.json``.

3. **Update the serializer** to declare all read fields with correct ``source`` attributes:

   .. code-block:: python

     # Before: separate values/field_map
     class MyViewSet(ValuesViewset):
         serializer_class = MySerializer  # may be write-only
         values = ("id", "full_name", "devicepermissions__is_superuser")
         field_map = {
             "is_superuser": lambda x: bool(x.pop("devicepermissions__is_superuser")),
         }

     # After: serializer defines everything
     class MySerializer(serializers.ModelSerializer):
         is_superuser = serializers.BooleanField(
             source="devicepermissions.is_superuser",
             read_only=True,
         )

         class Meta:
             model = FacilityUser
             fields = ("id", "full_name", "is_superuser")

     class MyViewSet(ValuesViewset):
         serializer_class = MySerializer
         # No values or field_map needed

4. **Convert ``field_map`` callables** to one of:

   - A serializer field with ``source`` (for simple renames)
   - A custom field class with ``to_representation()`` (for transforms repeated across serializers)
   - A ``ValuesMethodField(sources=(...))`` (for one-off computation from one or more columns)
   - Deferred field handling in ``consolidate()`` (for complex restructuring)

5. **Convert manual consolidation** of nested data:

   - If the viewset manually does ``groupby`` to build nested lists, define a nested serializer with ``many=True`` and let auto-deferral handle it
   - If the nested data is fetched separately, add it to ``deferred_fields`` and use ``serialize_queryset()``

6. **Remove** the explicit ``values`` tuple and ``field_map`` dict.

7. **Run tests** and verify output is identical.

8. **Compare performance against the baseline**:

   .. code-block:: bash

     python integration_testing/scripts/viewset_serialization_benchmark.py \
         kolibri.core.auth.api.FacilityUserViewSet \
         --compare baseline.json

   The script compares timing and memory against the baseline and flags regressions that exceed configurable thresholds (default: 5% timing, 10% memory). It also compares data hashes to confirm output equivalence.

   If a regression is detected, investigate before proceeding — the serializer-derived path should be at least as fast as the explicit pattern. Common causes include unnecessary ``to_representation`` calls on fields that could use inferred types, or missing ``select_related``/``prefetch_related`` on the queryset.

Explicit Values (Legacy)
~~~~~~~~~~~~~~~~~~~~~~~~~

.. note::

   The explicit ``values``/``field_map`` pattern described below is being replaced by the serializer-derived pattern above. Existing viewsets using this pattern continue to work, but new viewsets should use serializer derivation.

A ``ValuesViewset`` can define an explicit ``values`` tuple and ``field_map`` dict:

.. code-block:: python

  class LessonViewset(ValuesViewset):
      queryset = Lesson.objects.all()
      values = ("id", "title", "is_active", "collection__name")
      field_map = {
          "active": "is_active",
          "classroom": lambda x: x.pop("collection__name"),
      }

``values``
^^^^^^^^^^^

Tuple of database field names to fetch. Supports foreign key lookups using ``__`` notation.

``field_map``
^^^^^^^^^^^^^^

Dictionary mapping output field names to either:

- **String**: simple rename (``"api_name": "db_field"``)
- **Callable**: transformation function receiving the item dict

Related Documentation
~~~~~~~~~~~~~~~~~~~~~

- :doc:`testing` - Testing ValuesViewset endpoints
- `Django Querysets <https://docs.djangoproject.com/en/stable/ref/models/querysets/>`__
- `Django values() <https://docs.djangoproject.com/en/stable/ref/models/querysets/#values>`__
