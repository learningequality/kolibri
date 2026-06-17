import datetime
from typing import Type
from unittest.mock import MagicMock

from django.db import connection
from django.db.models import Model
from django.test import override_settings
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from parameterized import parameterized
from rest_framework import serializers

from kolibri.core.api import BaseValuesViewset
from kolibri.core.api import ListModelMixin
from kolibri.core.api import ValuesMethodField
from kolibri.core.api import ValuesViewsetOrderingFilter
from kolibri.core.serializers import HexOnlyUUIDField
from kolibri.core.test.test_app.models import Author
from kolibri.core.test.test_app.models import Book
from kolibri.core.test.test_app.models import Classroom
from kolibri.core.test.test_app.models import DateTimeTzModel
from kolibri.core.test.test_app.models import Enrollment
from kolibri.core.test.test_app.models import Profile
from kolibri.core.test.test_app.models import Publisher
from kolibri.core.test.test_app.models import Tag


def create_mock_queryset(flat_items, model: Type[Model] = Author):
    """Mock queryset that returns flat_items from .values()."""
    mock_qs = MagicMock()
    mock_qs.model = model
    annotation_renames = {}  # {target_key: source_key} built up by annotate() calls

    def annotate_side_effect(**kwargs):
        for target, expr in kwargs.items():
            annotation_renames[target] = expr.name  # F("source").name == "source"
        return mock_qs  # support chaining: queryset = queryset.annotate(...)

    def values_side_effect(*fields):
        # Apply recorded F() annotation renames to flat_items
        result = []
        for item in flat_items:
            row = dict(item)
            for target, source in annotation_renames.items():
                if source in row:
                    row[target] = row.pop(source)
            result.append(row)
        return result

    mock_qs.annotate.side_effect = annotate_side_effect
    mock_qs.values.side_effect = values_side_effect
    return mock_qs


def make_serializer(model: Type[Model] = Author, **fields):
    """Create a ModelSerializer class dynamically. Returns a CLASS."""
    meta = type("Meta", (), {"model": model, "fields": list(fields.keys())})
    attrs: dict = dict(fields)
    attrs["Meta"] = meta
    return type("DynamicSerializer", (serializers.ModelSerializer,), attrs)


def make_nested(
    model: Type[Model] = Author,
    many=False,
    source=None,
    allow_null=False,
    **fields,
):
    """Create a nested serializer INSTANCE for embedding in another serializer."""
    child_cls = make_serializer(model=model, **fields)
    kwargs: dict = {}
    if many:
        kwargs["many"] = True
    if source:
        kwargs["source"] = source
    if allow_null:
        kwargs["allow_null"] = True
    return child_cls(**kwargs)


def make_viewset(
    serializer_class=None,
    model: Type[Model] = Author,
    queryset=None,
    deferred_fields=(),
    **fields,
):
    """Create a viewset INSTANCE. Builds serializer from **fields if none provided."""
    if serializer_class is None:
        serializer_class = make_serializer(model=model, **fields)
    if queryset is None:
        queryset = model.objects.none()
    attrs: dict = {"queryset": queryset, "serializer_class": serializer_class}
    if deferred_fields:
        attrs["deferred_fields"] = deferred_fields
    cls = type("DynamicViewset", (BaseValuesViewset, ListModelMixin), attrs)
    return cls()


BookSerializer = make_serializer(
    model=Book, id=serializers.CharField(), title=serializers.CharField()
)
TagSerializer = make_serializer(
    model=Tag, id=serializers.CharField(), name=serializers.CharField()
)
ClassroomSerializer = make_serializer(
    model=Classroom, id=serializers.CharField(), name=serializers.CharField()
)


def author_books_viewset(deferred=False, **extra_author_fields):
    """Author(id) + books(many=True) reverse FK with id+title."""
    return make_viewset(
        id=serializers.CharField(),
        books=make_nested(
            model=Book,
            many=True,
            id=serializers.CharField(),
            title=serializers.CharField(),
        ),
        deferred_fields=("books",) if deferred else (),
        **extra_author_fields,
    )


def _serialize(viewset, flat_items, **kwargs):
    """Shortcut: create mock queryset and serialize in one call."""
    mock_qs = create_mock_queryset(flat_items, **kwargs)
    return viewset.serialize(mock_qs)


def _assert_serialize_raises(test_case, viewset, flat_items, expected_substr):
    """Assert that serialize() raises ValueError containing expected_substr."""
    mock_qs = create_mock_queryset(flat_items)
    with test_case.assertRaises(ValueError) as ctx:
        viewset.serialize(mock_qs)
    test_case.assertIn(expected_substr, str(ctx.exception))


class TestDataSerialization(TestCase):
    """Integration: ``viewset.serialize()`` over real Django querysets.

    Covers the field-level contract (rename, type inference, default, dot
    notation, write-only, PK-related, choice, FK traversal,
    ``ValuesMethodField``), every relation shape (FK, OneToOne fwd/rev,
    reverse FK, direct M2M fwd/rev, M2M-through, scalar-many across each),
    and the row-merging invariants (grouping, dedup, ordering preservation,
    null-join handling, scalar-many collection) against real database rows.

    A shared ``setUpTestData`` fixture covers every relation type:

    - ``alice`` — publisher + profile + 3 books (``book_a3`` has null
      description) + 2 classrooms via Enrollment
    - ``bob`` — publisher + profile + 1 book, no classrooms
    - ``carol`` — orphan: no publisher, no profile, no books, no classrooms
    - Tags ``fiction`` + ``classic`` (``book_a1`` has both, ``book_a2`` has
      ``fiction``)
    - Alice's books × classrooms produces the cartesian needed for dedup tests
    """

    @classmethod
    def setUpTestData(cls):
        cls.main_publisher = Publisher.objects.create(name="Main House")

        cls.alice = Author.objects.create(
            name="Alice",
            email="alice@example.com",
            publisher=cls.main_publisher,
        )
        cls.bob = Author.objects.create(
            name="Bob",
            email="bob@example.com",
            publisher=cls.main_publisher,
        )
        cls.carol = Author.objects.create(
            name="Carol",
            email="carol@example.com",
            publisher=None,
        )

        cls.alice_profile = Profile.objects.create(
            author=cls.alice, bio="SF writer", is_verified=True
        )
        cls.bob_profile = Profile.objects.create(
            author=cls.bob, bio="Poet", is_verified=False
        )

        cls.book_a1 = Book.objects.create(author=cls.alice, title="Alice Book 1")
        cls.book_a2 = Book.objects.create(author=cls.alice, title="Alice Book 2")
        cls.book_a3 = Book.objects.create(
            author=cls.alice, title="Alice Book 3", description=None
        )
        cls.book_b1 = Book.objects.create(author=cls.bob, title="Bob Book 1")

        cls.tag_fiction = Tag.objects.create(name="fiction")
        cls.tag_classic = Tag.objects.create(name="classic")
        cls.book_a1.tags.add(cls.tag_fiction, cls.tag_classic)
        cls.book_a2.tags.add(cls.tag_fiction)

        cls.classroom_101 = Classroom.objects.create(name="Room 101")
        cls.classroom_102 = Classroom.objects.create(name="Room 102")
        Enrollment.objects.create(author=cls.alice, classroom=cls.classroom_101)
        Enrollment.objects.create(author=cls.alice, classroom=cls.classroom_102)

    def _run(self, viewset):
        """Run the viewset's own queryset through serialize()."""
        return viewset.serialize(viewset.get_queryset())

    # Field contract

    def test_flat_field_rename(self):
        """Field with source != name: output uses declared name, source is removed."""
        viewset = make_viewset(
            queryset=Author.objects.filter(pk=self.alice.pk),
            author_id=serializers.UUIDField(source="id"),
            display_name=serializers.CharField(source="name"),
        )
        result = self._run(viewset)
        self.assertEqual(
            result[0],
            {"author_id": self.alice.pk, "display_name": "Alice"},
        )

    def test_matching_field_type_skips_transform(self):
        """Declared CharField on CharField model — simple rename, no to_representation."""
        viewset = make_viewset(
            queryset=Author.objects.filter(pk=self.alice.pk),
            display_name=serializers.CharField(source="name"),
        )
        result = self._run(viewset)
        self.assertEqual(result[0], {"display_name": "Alice"})

    def test_plain_rename_uses_sql_alias(self):
        """Plain source-rename (matching type, no to_representation) produces a
        SQL-level alias so .values() returns the target key directly, avoiding
        a Python-level dict rename per row."""
        viewset = make_viewset(
            queryset=Author.objects.filter(pk=self.alice.pk),
            display_name=serializers.CharField(source="name"),
        )
        with CaptureQueriesContext(connection) as ctx:
            result = self._run(viewset)
        self.assertEqual(result[0], {"display_name": "Alice"})
        # With the F() annotation optimization the SQL alias is "display_name",
        # not "name" (which would require a Python-level rename afterwards).
        self.assertIn("display_name", ctx[0]["sql"])

    def test_mismatched_field_type_applies_transform(self):
        """Declared field type differs from inferred — to_representation is called."""

        class UppercaseField(serializers.CharField):
            def to_representation(self, value):
                return value.upper() if value else value

        viewset = make_viewset(
            queryset=Author.objects.filter(pk=self.alice.pk),
            display_name=UppercaseField(source="name"),
        )
        result = self._run(viewset)
        self.assertEqual(result[0]["display_name"], "ALICE")

    def test_custom_field_in_nested_child_applies_transform(self):
        """Custom to_representation on a nested child field is applied."""

        class UppercaseField(serializers.CharField):
            def to_representation(self, value):
                return value.upper() if value else value

        BookSer = make_serializer(
            model=Book,
            id=serializers.IntegerField(),
            loud_title=UppercaseField(source="title"),
        )
        viewset = make_viewset(
            queryset=Author.objects.filter(pk=self.alice.pk),
            id=serializers.UUIDField(),
            books=BookSer(many=True),
        )
        result = self._run(viewset)
        loud_titles = {b["loud_title"] for b in result[0]["books"]}
        self.assertEqual(
            loud_titles,
            {"ALICE BOOK 1", "ALICE BOOK 2", "ALICE BOOK 3"},
        )

    def test_default_used_when_value_is_none(self):
        """Field with a declared default substitutes for None raw values.

        Covers LEFT-JOIN misses on OneToOne fields: alice has a Profile
        (``is_verified=True``); carol has none, so the joined column comes
        back as ``None`` and the declared ``default=False`` kicks in.
        """
        viewset = make_viewset(
            queryset=Author.objects.filter(pk__in=[self.alice.pk, self.carol.pk]),
            id=serializers.UUIDField(),
            is_verified=serializers.BooleanField(
                source="profile.is_verified",
                default=False,
            ),
        )
        result = self._run(viewset)
        by_id = {r["id"]: r["is_verified"] for r in result}
        self.assertEqual(by_id[self.alice.pk], True)
        self.assertEqual(by_id[self.carol.pk], False)

    def test_dot_notation_source_converted_to_underscore(self):
        """DRF dot-notation source is converted to ``__`` at the Django
        boundary, for both flat and nested-child fields. A successful
        result with declared-name keys implies the conversion worked."""
        viewset = make_viewset(
            queryset=Author.objects.filter(pk=self.alice.pk),
            id=serializers.UUIDField(),
            publisher_name=serializers.CharField(source="publisher.name"),
            books=make_nested(
                model=Book,
                many=True,
                id=serializers.IntegerField(),
                author_name=serializers.CharField(source="author.name"),
            ),
        )
        result = self._run(viewset)
        self.assertEqual(result[0]["publisher_name"], "Main House")
        for book in result[0]["books"]:
            self.assertEqual(book["author_name"], "Alice")

    def test_write_only_field_excluded_from_output(self):
        """write_only fields are neither fetched nor present in output."""
        viewset = make_viewset(
            queryset=Author.objects.filter(pk=self.alice.pk),
            id=serializers.UUIDField(),
            email=serializers.CharField(write_only=True),
        )
        result = self._run(viewset)
        self.assertEqual(result[0], {"id": self.alice.pk})

    def test_none_value_not_passed_to_transform(self):
        """None raw values short-circuit both rename and in-place transform paths.

        ``book_a3.description`` is ``None`` — a custom ``to_representation``
        that would raise on ``None`` must never be called.
        """

        class FailOnNoneField(serializers.Field):
            def to_representation(self, value):
                if value is None:
                    raise ValueError("received None!")
                return str(value).upper()

        # Rename path: source != declared name.
        rename_viewset = make_viewset(
            queryset=Book.objects.filter(pk=self.book_a3.pk),
            id=serializers.IntegerField(),
            loud_desc=FailOnNoneField(source="description"),
        )
        result = self._run(rename_viewset)
        self.assertIsNone(result[0]["loud_desc"])

        # In-place path: source == declared name.
        in_place_viewset = make_viewset(
            queryset=Book.objects.filter(pk=self.book_a3.pk),
            id=serializers.IntegerField(),
            description=FailOnNoneField(),
        )
        result = self._run(in_place_viewset)
        self.assertIsNone(result[0]["description"])

    def test_primary_key_related_field_on_fk_passes_through(self):
        """PrimaryKeyRelatedField on a FK model field passes the raw PK through.

        ``values()`` returns the raw FK value (e.g. a UUID string).
        ``PrimaryKeyRelatedField.to_representation`` expects a model
        instance, so the introspection must recognize the match and skip
        the transform.
        """
        viewset = make_viewset(
            queryset=Author.objects.filter(pk=self.alice.pk),
            id=serializers.UUIDField(),
            publisher=serializers.PrimaryKeyRelatedField(
                queryset=Publisher.objects.all(),
            ),
        )
        result = self._run(viewset)
        self.assertEqual(result[0]["publisher"], self.main_publisher.pk)

    def test_choice_field_serialization(self):
        """ChoiceField with declared choices passes raw values through."""
        retired = Author.objects.create(
            name="Retired", email="retired@example.com", status="retired"
        )
        blank = Author.objects.create(
            name="Blank", email="blank@example.com", status=""
        )
        viewset = make_viewset(
            queryset=Author.objects.filter(
                pk__in=[self.alice.pk, retired.pk, blank.pk]
            ),
            id=serializers.UUIDField(),
            author_status=serializers.ChoiceField(
                source="status",
                choices=[("", ""), ("active", "Active"), ("retired", "Retired")],
            ),
        )
        result = self._run(viewset)
        by_id = {r["id"]: r["author_status"] for r in result}
        self.assertEqual(by_id[self.alice.pk], "active")
        self.assertEqual(by_id[retired.pk], "retired")
        self.assertEqual(by_id[blank.pk], "")

    def test_boolean_field_on_boolean_model_field_matches(self):
        """BooleanField on a BooleanField model field — no transform applied."""
        viewset = make_viewset(
            queryset=Author.objects.filter(pk=self.alice.pk),
            active=serializers.BooleanField(source="is_active"),
        )
        result = self._run(viewset)
        self.assertEqual(result[0]["active"], True)

    def test_uuid_field_on_uuid_model_field_passes_through(self):
        """UUIDField on Author.id (UUIDField) — raw UUID passes through."""
        viewset = make_viewset(
            queryset=Author.objects.filter(pk=self.alice.pk),
            author_id=serializers.UUIDField(source="id"),
            name=serializers.CharField(),
        )
        result = self._run(viewset)
        self.assertEqual(result[0]["author_id"], self.alice.pk)

    def test_hex_uuid_field_on_char_model_field_is_passthrough(self):
        """HexOnlyUUIDField(format='hex') on a CharField model field (e.g. morango
        UUID storage) is a no-op: the DB already returns hex strings, so
        to_representation adds no transformation. The field_map.is_noop()
        must return True so _serialize_flat can skip dict creation."""
        # Author.email and Author.name are both CharField — simulates morango UUID
        viewset = make_viewset(
            queryset=Author.objects.none(),
            name=serializers.CharField(),
            email=HexOnlyUUIDField(),
        )
        field_map = viewset._field_map
        self.assertTrue(field_map.is_noop())

    def test_plain_serializer_method_field_rejected(self):
        """Plain ``SerializerMethodField`` is not supported on ValuesViewset;
        class init raises ``TypeError`` pointing at ``ValuesMethodField``."""

        class S(serializers.ModelSerializer):
            label = serializers.SerializerMethodField()

            def get_label(self, instance):
                return "x"

            class Meta:
                model = Author
                fields = ("id", "label")

        V = type(
            "V",
            (BaseValuesViewset, ListModelMixin),
            {"serializer_class": S, "queryset": Author.objects.none()},
        )
        with self.assertRaises(TypeError) as ctx:
            V()
        self.assertIn("ValuesMethodField", str(ctx.exception))

    def test_method_field_sees_python_value_not_serialized_form(self):
        """The proxy exposes the Python value a bound method would see in
        vanilla DRF (e.g. a ``datetime``) — not the post-``to_representation``
        form (ISO-8601 string). The method can only return a year int if it
        received an actual ``datetime``.
        """
        aware = timezone.get_current_timezone().localize(
            datetime.datetime(2026, 4, 23, 10, 30, 0)
        )
        dtm = DateTimeTzModel.objects.create(timestamp=aware)

        class S(serializers.ModelSerializer):
            id = serializers.IntegerField()
            timestamp = serializers.DateTimeField()
            timestamp_year = ValuesMethodField(sources=("timestamp",))

            def get_timestamp_year(self, obj):
                return obj.timestamp.year

            class Meta:
                model = DateTimeTzModel
                fields = ("id", "timestamp", "timestamp_year")

        viewset = make_viewset(
            serializer_class=S,
            queryset=DateTimeTzModel.objects.filter(pk=dtm.pk),
        )
        result = self._run(viewset)
        self.assertEqual(result[0]["timestamp_year"], 2026)

    def test_method_field_proxy_raises_on_undeclared_attribute(self):
        """Proxy access to an attribute not in ``sources`` raises
        ``AttributeError``; the message names the requested attribute and
        surfaces the declared sources so the boundary is discoverable."""

        class S(serializers.ModelSerializer):
            id = serializers.UUIDField()
            label = ValuesMethodField(sources=("name",))

            def get_label(self, obj):
                return obj.email  # not declared

            class Meta:
                model = Author
                fields = ("id", "label")

        viewset = make_viewset(
            serializer_class=S,
            queryset=Author.objects.filter(pk=self.alice.pk),
        )
        with self.assertRaises(AttributeError) as ctx:
            self._run(viewset)
        message = str(ctx.exception)
        self.assertIn("email", message)
        self.assertIn("name", message)

    def test_method_field_empty_sources_invokes_method(self):
        """``sources=()`` still invokes the bound method — useful for
        constant-returning computations (e.g. reading a global setting)."""

        class S(serializers.ModelSerializer):
            id = serializers.UUIDField()
            constant = ValuesMethodField(sources=())

            def get_constant(self, obj):
                return "always-same"

            class Meta:
                model = Author
                fields = ("id", "constant")

        viewset = make_viewset(
            serializer_class=S,
            queryset=Author.objects.filter(pk=self.alice.pk),
        )
        result = self._run(viewset)
        self.assertEqual(result[0]["constant"], "always-same")

    def test_nested_non_model_serializer_treated_as_regular_field(self):
        """A nested plain ``Serializer`` over a JSONField column is treated
        as a regular field: its ``to_representation`` runs on the raw dict,
        so undeclared keys are dropped from the output."""

        class MetadataSerializer(serializers.Serializer):
            a = serializers.CharField()
            b = serializers.CharField()
            c = serializers.CharField()

        self.alice.metadata = {"a": "alpha", "b": "beta", "c": "gamma", "d": "delta"}
        self.alice.save()

        viewset = make_viewset(
            queryset=Author.objects.filter(pk=self.alice.pk),
            id=serializers.UUIDField(),
            metadata=MetadataSerializer(),
        )
        result = self._run(viewset)
        self.assertEqual(
            result[0]["metadata"],
            {"a": "alpha", "b": "beta", "c": "gamma"},
        )

    # Relation shapes

    def test_fk_single_nested(self):
        viewset = make_viewset(
            queryset=Book.objects.filter(pk=self.book_a1.pk),
            id=serializers.IntegerField(),
            title=serializers.CharField(),
            author=make_nested(
                model=Author,
                id=serializers.UUIDField(),
                name=serializers.CharField(),
            ),
        )
        result = self._run(viewset)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["author"]["name"], "Alice")

    def test_one_to_one_forward_single_nested(self):
        viewset = make_viewset(
            model=Profile,
            queryset=Profile.objects.filter(pk=self.alice_profile.pk),
            id=serializers.IntegerField(),
            bio=serializers.CharField(),
            author=make_nested(
                model=Author,
                id=serializers.UUIDField(),
                name=serializers.CharField(),
            ),
        )
        result = self._run(viewset)
        self.assertEqual(result[0]["author"]["name"], "Alice")

    def test_one_to_one_reverse_single_nested(self):
        viewset = make_viewset(
            queryset=Author.objects.filter(pk=self.alice.pk),
            id=serializers.UUIDField(),
            profile=make_nested(
                model=Profile,
                allow_null=True,
                id=serializers.IntegerField(),
                bio=serializers.CharField(),
            ),
        )
        result = self._run(viewset)
        self.assertEqual(result[0]["profile"]["bio"], "SF writer")

    def test_reverse_fk_many_nested(self):
        viewset = make_viewset(
            queryset=Author.objects.filter(pk=self.alice.pk),
            id=serializers.UUIDField(),
            books=make_nested(
                model=Book,
                many=True,
                id=serializers.IntegerField(),
                title=serializers.CharField(),
            ),
        )
        result = self._run(viewset)
        titles = sorted(b["title"] for b in result[0]["books"])
        self.assertEqual(titles, ["Alice Book 1", "Alice Book 2", "Alice Book 3"])

    def test_m2m_direct_forward_many_nested(self):
        viewset = make_viewset(
            model=Book,
            queryset=Book.objects.filter(pk=self.book_a1.pk),
            id=serializers.IntegerField(),
            tags=make_nested(
                model=Tag,
                many=True,
                id=serializers.IntegerField(),
                name=serializers.CharField(),
            ),
        )
        result = self._run(viewset)
        names = sorted(t["name"] for t in result[0]["tags"])
        self.assertEqual(names, ["classic", "fiction"])

    def test_m2m_direct_reverse_many_nested(self):
        viewset = make_viewset(
            model=Tag,
            queryset=Tag.objects.filter(pk=self.tag_fiction.pk),
            id=serializers.IntegerField(),
            books=make_nested(
                model=Book,
                many=True,
                id=serializers.IntegerField(),
                title=serializers.CharField(),
            ),
        )
        result = self._run(viewset)
        titles = sorted(b["title"] for b in result[0]["books"])
        self.assertEqual(titles, ["Alice Book 1", "Alice Book 2"])

    def test_m2m_through_many_nested(self):
        viewset = make_viewset(
            queryset=Author.objects.filter(pk=self.alice.pk),
            id=serializers.UUIDField(),
            classrooms=make_nested(
                model=Classroom,
                many=True,
                id=serializers.IntegerField(),
                name=serializers.CharField(),
            ),
        )
        result = self._run(viewset)
        names = sorted(c["name"] for c in result[0]["classrooms"])
        self.assertEqual(names, ["Room 101", "Room 102"])

    def test_scalar_many_via_reverse_fk(self):
        viewset = make_viewset(
            queryset=Author.objects.filter(pk=self.alice.pk),
            id=serializers.UUIDField(),
            book_titles=serializers.CharField(source="books.title"),
        )
        result = self._run(viewset)
        self.assertEqual(
            sorted(result[0]["book_titles"]),
            ["Alice Book 1", "Alice Book 2", "Alice Book 3"],
        )

    def test_scalar_many_via_m2m_direct(self):
        """Exercises the ``many_to_many`` branch of _source_crosses_many_relation."""
        viewset = make_viewset(
            model=Book,
            queryset=Book.objects.filter(pk=self.book_a1.pk),
            id=serializers.IntegerField(),
            tag_names=serializers.CharField(source="tags.name"),
        )
        result = self._run(viewset)
        self.assertEqual(sorted(result[0]["tag_names"]), ["classic", "fiction"])

    def test_scalar_many_via_m2m_through(self):
        viewset = make_viewset(
            queryset=Author.objects.filter(pk=self.alice.pk),
            id=serializers.UUIDField(),
            classroom_names=serializers.CharField(source="classrooms.name"),
        )
        result = self._run(viewset)
        self.assertEqual(sorted(result[0]["classroom_names"]), ["Room 101", "Room 102"])

    # Consolidation invariants

    def test_many_rows_same_parent_merge(self):
        """Multiple books for one author collapse into a single output row."""
        viewset = make_viewset(
            queryset=Author.objects.filter(pk=self.alice.pk),
            id=serializers.UUIDField(),
            books=make_nested(
                model=Book,
                many=True,
                id=serializers.IntegerField(),
                title=serializers.CharField(),
            ),
        )
        result = self._run(viewset)
        self.assertEqual(len(result), 1)
        self.assertEqual(len(result[0]["books"]), 3)

    def test_null_many_nested_produces_empty_list(self):
        """Author with no related books yields [] — LEFT JOIN miss."""
        viewset = make_viewset(
            queryset=Author.objects.filter(pk=self.carol.pk),
            id=serializers.UUIDField(),
            books=make_nested(
                model=Book,
                many=True,
                id=serializers.IntegerField(),
                title=serializers.CharField(),
            ),
        )
        result = self._run(viewset)
        self.assertEqual(result[0]["books"], [])

    def test_null_single_fk_produces_null(self):
        """Author with no publisher — single-nested FK yields None."""
        viewset = make_viewset(
            queryset=Author.objects.filter(pk=self.carol.pk),
            id=serializers.UUIDField(),
            publisher_info=make_nested(
                model=Publisher,
                source="publisher",
                allow_null=True,
                id=serializers.IntegerField(),
                name=serializers.CharField(),
            ),
        )
        result = self._run(viewset)
        self.assertIsNone(result[0]["publisher_info"])

    def test_nullable_first_field_in_nested_not_dropped(self):
        """Nested row with null first declared field but non-null PK is kept.

        ``book_a3`` has ``description=None`` but a valid id. Declaring
        ``description`` as the first nested field must not cause the nested
        dict to be dropped — the null-check uses the PK, not field order.
        """
        BookSer = make_serializer(
            model=Book,
            description=serializers.CharField(allow_null=True),
            id=serializers.IntegerField(),
        )
        viewset = make_viewset(
            queryset=Author.objects.filter(pk=self.alice.pk),
            id=serializers.UUIDField(),
            books=BookSer(many=True),
        )
        result = self._run(viewset)
        self.assertEqual(len(result[0]["books"]), 3)
        book_a3 = next(b for b in result[0]["books"] if b["id"] == self.book_a3.pk)
        self.assertIsNone(book_a3["description"])

    def test_duplicate_child_rows_deduplicated(self):
        """Cartesian rows (books × classrooms) collapse to actual child counts.

        Alice has 3 books × 2 classrooms = 6 rows via the cartesian, but
        the nested list must dedupe to 3 books and the scalar-many to 2
        classroom names.
        """
        viewset = make_viewset(
            queryset=Author.objects.filter(pk=self.alice.pk),
            id=serializers.UUIDField(),
            books=make_nested(
                model=Book,
                many=True,
                id=serializers.IntegerField(),
                title=serializers.CharField(),
            ),
            classroom_names=serializers.CharField(source="classrooms.name"),
        )
        result = self._run(viewset)
        self.assertEqual(len(result[0]["books"]), 3)
        self.assertEqual(len(result[0]["classroom_names"]), 2)

    def test_queryset_ordering_preserved(self):
        """Output order matches queryset order, not PK order (groupby sorts by PK)."""
        viewset = make_viewset(
            queryset=Author.objects.order_by("-email"),
            id=serializers.UUIDField(),
            email=serializers.CharField(),
        )
        result = self._run(viewset)
        self.assertEqual(
            [item["email"] for item in result],
            ["carol@example.com", "bob@example.com", "alice@example.com"],
        )

    def test_scalar_many_deduplicates_values(self):
        """Duplicates from a cartesian collapse to unique scalar entries.

        Joining both books and classrooms for Alice creates a cartesian
        where each book title appears twice (once per classroom). Scalar-many
        dedup collapses back to 3 unique titles.
        """
        viewset = make_viewset(
            queryset=Author.objects.filter(pk=self.alice.pk),
            id=serializers.UUIDField(),
            book_titles=serializers.CharField(source="books.title"),
            classroom_names=serializers.CharField(source="classrooms.name"),
        )
        result = self._run(viewset)
        self.assertEqual(len(result[0]["book_titles"]), 3)
        self.assertEqual(len(result[0]["classroom_names"]), 2)

    def test_scalar_many_null_produces_empty_list(self):
        """Scalar-many with no related rows yields []."""
        viewset = make_viewset(
            queryset=Author.objects.filter(pk=self.carol.pk),
            id=serializers.UUIDField(),
            book_titles=serializers.CharField(source="books.title"),
        )
        result = self._run(viewset)
        self.assertEqual(result[0]["book_titles"], [])

    def test_method_field_excludes_unshared_source(self):
        """A source referenced only by ``ValuesMethodField`` is fetched into
        ``values()`` but does not appear in the serialized output row."""

        class S(serializers.ModelSerializer):
            id = serializers.UUIDField()
            label = ValuesMethodField(sources=("name",))

            def get_label(self, obj):
                return "label: {}".format(obj.name)

            class Meta:
                model = Author
                fields = ("id", "label")

        viewset = make_viewset(
            serializer_class=S,
            queryset=Author.objects.filter(pk=self.alice.pk),
        )
        result = self._run(viewset)
        self.assertEqual(set(result[0].keys()), {"id", "label"})
        self.assertEqual(result[0]["label"], "label: Alice")

    def test_method_field_keeps_shared_source_under_declared_name(self):
        """When the method's source is also a declared field, it stays in
        output under its declared name."""

        class S(serializers.ModelSerializer):
            id = serializers.UUIDField()
            name = serializers.CharField()
            label = ValuesMethodField(sources=("name",))

            def get_label(self, obj):
                return "label: {}".format(obj.name)

            class Meta:
                model = Author
                fields = ("id", "name", "label")

        viewset = make_viewset(
            serializer_class=S,
            queryset=Author.objects.filter(pk=self.alice.pk),
        )
        result = self._run(viewset)
        self.assertEqual(result[0]["name"], "Alice")
        self.assertEqual(result[0]["label"], "label: Alice")

    def test_method_field_reads_dotted_source_from_fk(self):
        """``sources=('publisher.name',)`` fetches ``publisher__name`` and the
        proxy walks it as ``obj.publisher.name``."""

        class S(serializers.ModelSerializer):
            id = serializers.UUIDField()
            publisher_label = ValuesMethodField(sources=("publisher.name",))

            def get_publisher_label(self, obj):
                return "pub: {}".format(obj.publisher.name)

            class Meta:
                model = Author
                fields = ("id", "publisher_label")

        viewset = make_viewset(
            serializer_class=S,
            queryset=Author.objects.filter(pk=self.alice.pk),
        )
        result = self._run(viewset)
        self.assertEqual(set(result[0].keys()), {"id", "publisher_label"})
        self.assertEqual(result[0]["publisher_label"], "pub: Main House")

    def test_method_field_reads_context_from_request(self):
        """The bound method's ``self.context`` is populated per-request from
        ``viewset.get_serializer_context()``."""

        class S(serializers.ModelSerializer):
            id = serializers.UUIDField()
            ctx_label = ValuesMethodField(sources=("name",))

            def get_ctx_label(self, obj):
                hint = self.context.get("hint", "missing")
                return "{}/{}".format(obj.name, hint)

            class Meta:
                model = Author
                fields = ("id", "ctx_label")

        viewset = make_viewset(
            serializer_class=S,
            queryset=Author.objects.filter(pk=self.alice.pk),
        )
        viewset.get_serializer_context = lambda: {"hint": "yo"}
        result = self._run(viewset)
        self.assertEqual(result[0]["ctx_label"], "Alice/yo")

    def test_serialize_queryset_group_by_returns_dict(self):
        """``serialize_queryset`` with ``group_by`` returns a dict keyed by
        the group column's value. The grouping column must be declared on
        the nested serializer — only declared fields reach the output."""
        viewset = make_viewset(
            id=serializers.UUIDField(),
            books=make_nested(
                model=Book,
                many=True,
                id=serializers.IntegerField(),
                title=serializers.CharField(),
                author=serializers.PrimaryKeyRelatedField(read_only=True),
            ),
            deferred_fields=("books",),
        )
        result = viewset.serialize_queryset(
            Book.objects.all(), "books", group_by="author"
        )
        self.assertEqual(set(result.keys()), {self.alice.pk, self.bob.pk})
        self.assertEqual(len(result[self.alice.pk]), 3)
        self.assertEqual(len(result[self.bob.pk]), 1)

    def test_serialize_queryset_consolidates_grand_nested_many(self):
        """``serialize_queryset`` for a path whose nested serializer itself
        has a ``many=True`` child must merge the JOIN-multiplied rows into
        per-parent lists, mirroring ``serialize()``'s consolidation. Without
        consolidation, ``book_a1`` (two tags) would appear twice in output.
        """
        TagSer = make_serializer(
            model=Tag,
            id=serializers.IntegerField(),
            name=serializers.CharField(),
        )
        BookSer = make_serializer(
            model=Book,
            id=serializers.IntegerField(),
            title=serializers.CharField(),
            tags=TagSer(many=True),
        )
        viewset = make_viewset(
            serializer_class=make_serializer(
                id=serializers.UUIDField(),
                books=BookSer(many=True),
            ),
            deferred_fields=("books",),
        )
        result = viewset.serialize_queryset(Book.objects.all(), "books")
        by_id = {r["id"]: r for r in result}
        # One row per book — book_a1 must not be duplicated by its 2 tags.
        self.assertEqual(len(result), 4)
        self.assertEqual(
            set(by_id),
            {self.book_a1.pk, self.book_a2.pk, self.book_a3.pk, self.book_b1.pk},
        )
        self.assertEqual(
            sorted(t["name"] for t in by_id[self.book_a1.pk]["tags"]),
            ["classic", "fiction"],
        )
        self.assertEqual(
            [t["name"] for t in by_id[self.book_a2.pk]["tags"]], ["fiction"]
        )
        self.assertEqual(by_id[self.book_a3.pk]["tags"], [])
        self.assertEqual(by_id[self.book_b1.pk]["tags"], [])

    def test_serialize_queryset_passes_context_to_nested_method_field(self):
        """A ``ValuesMethodField`` on a nested serializer must read
        per-request context via ``self.context`` when reached through
        ``serialize_queryset``. The context flows in through the cached
        parent's threading-local ``_context``: ``Field.context`` walks
        ``self.root._context``, so the nested bound method sees the same
        dict the scope manager populated for this request.
        """

        class BookSer(serializers.ModelSerializer):
            id = serializers.IntegerField()
            title_with_hint = ValuesMethodField(sources=("title",))

            def get_title_with_hint(self, obj):
                hint = self.context.get("hint", "missing")
                return "{}/{}".format(obj.title, hint)

            class Meta:
                model = Book
                fields = ("id", "title_with_hint")

        class S(serializers.ModelSerializer):
            id = serializers.UUIDField()
            books = BookSer(many=True)

            class Meta:
                model = Author
                fields = ("id", "books")

        viewset = make_viewset(serializer_class=S, deferred_fields=("books",))
        viewset.get_serializer_context = lambda: {"hint": "yo"}
        result = viewset.serialize_queryset(
            Book.objects.filter(pk=self.book_a1.pk), "books"
        )
        self.assertEqual(result[0]["title_with_hint"], "Alice Book 1/yo")

    def test_nested_path_deferred_with_consolidate(self):
        """Full pipeline: ``Publisher`` → ``authors`` (deferred at top),
        ``AuthorSer`` has ``books`` (joined inside the authors query) and
        ``enrollments`` (deferred deeper via ``authors__enrollments``).
        ``consolidate`` batches both deferred layers via ``group_by``
        so the whole result is two extra queries — no N+1.
        """
        BookSer = make_serializer(
            model=Book,
            id=serializers.IntegerField(),
            title=serializers.CharField(),
        )
        EnrollmentSer = make_serializer(
            model=Enrollment,
            id=serializers.IntegerField(),
            classroom=serializers.PrimaryKeyRelatedField(read_only=True),
            author=serializers.PrimaryKeyRelatedField(read_only=True),
        )
        AuthorSer = make_serializer(
            model=Author,
            id=serializers.UUIDField(),
            publisher=serializers.PrimaryKeyRelatedField(read_only=True),
            books=BookSer(many=True),
            enrollments=EnrollmentSer(many=True),
        )
        Ser = make_serializer(
            model=Publisher,
            id=serializers.IntegerField(),
            name=serializers.CharField(),
            authors=AuthorSer(many=True),
        )

        class V(BaseValuesViewset, ListModelMixin):
            queryset = Publisher.objects.filter(pk=self.main_publisher.pk)
            serializer_class = Ser
            deferred_fields = ("authors", "authors__enrollments")

            def consolidate(self, items, queryset):
                if not items:
                    return items
                pub_ids = [p["id"] for p in items]
                authors_by_pub = self.serialize_queryset(
                    Author.objects.filter(publisher_id__in=pub_ids),
                    "authors",
                    group_by="publisher",
                )
                author_ids = [
                    a["id"] for authors in authors_by_pub.values() for a in authors
                ]
                enrollments_by_author = self.serialize_queryset(
                    Enrollment.objects.filter(author_id__in=author_ids),
                    "authors__enrollments",
                    group_by="author",
                )
                for pub in items:
                    pub_authors = authors_by_pub.get(pub["id"], [])
                    for author in pub_authors:
                        author["enrollments"] = enrollments_by_author.get(
                            author["id"], []
                        )
                    pub["authors"] = pub_authors
                return items

        result = V().serialize(V().queryset)
        self.assertEqual(len(result), 1)
        pub = result[0]
        self.assertEqual(pub["name"], "Main House")

        authors_by_id = {a["id"]: a for a in pub["authors"]}
        self.assertEqual(set(authors_by_id), {self.alice.pk, self.bob.pk})

        # alice: 3 books joined inside authors, 2 enrollments deferred deeper.
        alice = authors_by_id[self.alice.pk]
        self.assertEqual(
            sorted(b["title"] for b in alice["books"]),
            ["Alice Book 1", "Alice Book 2", "Alice Book 3"],
        )
        self.assertEqual(
            sorted(e["classroom"] for e in alice["enrollments"]),
            [self.classroom_101.pk, self.classroom_102.pk],
        )

        # bob: 1 book, 0 enrollments.
        bob = authors_by_id[self.bob.pk]
        self.assertEqual([b["title"] for b in bob["books"]], ["Bob Book 1"])
        self.assertEqual(bob["enrollments"], [])


class TestLegacyViewset(TestCase):
    """Viewsets using the pre-serializer-derivation pattern (explicit
    ``values`` tuple + ``field_map`` dict) must continue to work, including
    inheritance semantics and MRO isolation between parent and child classes.
    """

    def test_explicit_values_and_string_field_map(self):
        """Explicit values tuple + string field_map renames source → declared key."""

        class V(BaseValuesViewset, ListModelMixin):
            queryset = Author.objects.none()
            values = ("id", "name")
            field_map = {"display_name": "name"}

        result = _serialize(V(), [{"id": "a1", "name": "Alice"}])
        self.assertEqual(result[0], {"id": "a1", "display_name": "Alice"})

    def test_callable_field_map(self):
        """Callable field_map entries receive the full item and can pop/transform."""

        def upper(item):
            return item.pop("name", "").upper()

        class V(BaseValuesViewset, ListModelMixin):
            queryset = Author.objects.none()
            values = ("id", "name")
            field_map = {"loud_name": upper}

        result = _serialize(V(), [{"id": "a1", "name": "alice"}])
        self.assertEqual(result[0]["loud_name"], "ALICE")

    def test_field_map_mutation_after_init_does_not_leak(self):
        """Mutating the class-level field_map after init must not affect the instance."""

        class V(BaseValuesViewset, ListModelMixin):
            queryset = Author.objects.none()
            values = ("id", "name")
            field_map = {"display_name": "name"}

        inst = V()
        V.field_map["injected"] = "id"  # post-init mutation
        result = _serialize(inst, [{"id": "a1", "name": "Alice"}])
        self.assertNotIn("injected", result[0])

    def test_child_inherits_parent_explicit_values(self):
        """A subclass without overrides serializes using parent's values + field_map."""

        class Parent(BaseValuesViewset, ListModelMixin):
            queryset = Author.objects.none()
            values = ("id", "name")
            field_map = {"display_name": "name"}

        class Child(Parent):
            pass

        result = _serialize(Child(), [{"id": "a1", "name": "Alice"}])
        self.assertEqual(result[0], {"id": "a1", "display_name": "Alice"})

    def test_subclass_serializer_does_not_reuse_parent_derived_info(self):
        """A subclass declaring its own serializer_class uses its own derived fields."""
        ParentSer = make_serializer(
            display_name=serializers.CharField(source="name"),
        )
        ChildSer = make_serializer(
            loud_name=serializers.CharField(source="name"),
        )

        class Parent(BaseValuesViewset, ListModelMixin):
            queryset = Author.objects.none()
            serializer_class = ParentSer

        class Child(Parent):
            serializer_class = ChildSer

        result = _serialize(Child(), [{"id": "a1", "name": "Alice"}])
        self.assertIn("loud_name", result[0])
        self.assertNotIn("display_name", result[0])

    def test_child_not_confused_by_parent_auto_derived_values(self):
        """Parent's auto-derived ``values`` (set on the class during
        ``_ensure_initialized`` to support the ordering filter) must not be
        treated as explicit when a child subclasses it. Otherwise the child
        falls into the explicit-values path and serializes with parent's
        fields rather than deriving from its own ``serializer_class``.
        """
        ParentSer = make_serializer(
            display_name=serializers.CharField(source="name"),
        )
        ChildSer = make_serializer(
            loud_name=serializers.CharField(source="name"),
        )

        class Parent(BaseValuesViewset, ListModelMixin):
            queryset = Author.objects.none()
            serializer_class = ParentSer

        Parent()  # Force init so cls.values is auto-set on Parent

        class Child(Parent):
            serializer_class = ChildSer

        result = _serialize(Child(), [{"id": "a1", "name": "Alice"}])
        self.assertIn("loud_name", result[0])
        self.assertNotIn("display_name", result[0])

    def test_child_not_confused_by_parent_generated_serializer_class(self):
        """Parent's auto-generated serializer must not leak to the child.

        generate_serializer() drops FK-traversal entries from values (they
        aren't direct model fields), so re-deriving from a parent's cached
        auto-generated serializer would lose those entries on the child.
        The child must still serialize rows that include the FK traversal.
        """

        class Parent(BaseValuesViewset, ListModelMixin):
            queryset = Author.objects.none()
            values = ("id", "name", "publisher__name")
            field_map = {
                "display_name": "name",
                "publisher_name": "publisher__name",
            }

        Parent().get_serializer_class()  # triggers the lossy auto-gen cache

        class Child(Parent):
            pass

        result = _serialize(
            Child(),
            [{"id": "a1", "name": "Alice", "publisher__name": "Main House"}],
        )
        self.assertEqual(result[0]["display_name"], "Alice")
        self.assertEqual(result[0]["publisher_name"], "Main House")

    def test_ordering_filter_over_explicit_field_map(self):
        """Ordering filter exposes explicit field_map keys as valid ordering fields."""

        class V(BaseValuesViewset, ListModelMixin):
            queryset = Author.objects.all()
            values = ("id", "name")
            field_map = {"display_name": "name"}

        valid = ValuesViewsetOrderingFilter().get_default_valid_fields(
            V().queryset, V()
        )
        self.assertIn(("display_name", "display_name"), valid)

    def test_ordering_filter_over_derived_field_map(self):
        """Ordering filter exposes declared serializer names when field_map is derived."""
        viewset = make_viewset(
            queryset=Author.objects.all(),
            id=serializers.UUIDField(),
            display_name=serializers.CharField(source="name"),
        )
        valid = ValuesViewsetOrderingFilter().get_default_valid_fields(
            viewset.queryset, viewset
        )
        self.assertIn(("display_name", "display_name"), valid)

    def test_ordering_filter_translates_declared_name_to_source(self):
        """Ordering by a declared name translates to the source column for the DB."""
        viewset = make_viewset(
            queryset=Author.objects.all(),
            id=serializers.UUIDField(),
            display_name=serializers.CharField(source="name"),
        )
        filter_backend = ValuesViewsetOrderingFilter()
        request = MagicMock()
        self.assertEqual(
            filter_backend.remove_invalid_fields(
                viewset.queryset, ["display_name"], viewset, request
            ),
            ["name"],
        )
        self.assertEqual(
            filter_backend.remove_invalid_fields(
                viewset.queryset, ["-display_name"], viewset, request
            ),
            ["-name"],
        )


class TestDevModeSafeguards(TestCase):
    """DEBUG-only contracts catch the configs developers are most likely to
    get wrong, plus errors for misconfigurations that would otherwise fail
    silently. The goal is surfacing problems at a useful boundary with
    identifying info in the error message.
    """

    @override_settings(DEBUG=True)
    def test_multiple_joined_many_nested_raises_error(self):
        """Two many=True nested serializers without deferring raise (cartesian product)."""
        Ser = make_serializer(
            id=serializers.CharField(),
            books=BookSerializer(many=True),
            classrooms=ClassroomSerializer(many=True),
        )
        with self.assertRaises(TypeError) as ctx:
            make_viewset(serializer_class=Ser)
        self.assertIn("books", str(ctx.exception))
        self.assertIn("classrooms", str(ctx.exception))

    def test_multiple_joined_many_with_one_deferred_is_fine(self):
        """Deferring one of two many-nested serializers avoids the cartesian error."""
        Ser = make_serializer(
            id=serializers.CharField(),
            books=BookSerializer(many=True),
            classrooms=ClassroomSerializer(many=True),
        )
        with override_settings(DEBUG=True):
            viewset = make_viewset(
                serializer_class=Ser, deferred_fields=("classrooms",)
            )
        result = _serialize(
            viewset,
            [{"id": "a1", "books__id": "b1", "books__title": "B1"}],
        )
        self.assertEqual(len(result[0]["books"]), 1)
        self.assertNotIn("classrooms", result[0])

    @override_settings(DEBUG=True)
    def test_multiple_many_inside_deferred_raises_error(self):
        """A deferred nested serializer whose own children include 2+
        un-deferred many=True nested serializers must raise: otherwise
        ``serialize_queryset`` for that path would silently emit cartesian
        rows (auto-consolidate dedupes but the SQL is over-fetched).
        """
        GcA = make_serializer(id=serializers.CharField())
        GcB = make_serializer(id=serializers.CharField())
        InnerSer = make_serializer(
            id=serializers.CharField(),
            tags=GcA(many=True),
            co_authors=GcB(many=True),
        )
        Ser = make_serializer(
            id=serializers.CharField(),
            books=InnerSer(many=True),
        )
        with self.assertRaises(TypeError) as ctx:
            make_viewset(serializer_class=Ser, deferred_fields=("books",))
        self.assertIn("tags", str(ctx.exception))
        self.assertIn("co_authors", str(ctx.exception))

    @parameterized.expand(
        [
            ("non_many_child_many_gc", False, True, "book"),
            ("many_child_many_gc", True, True, "books_outer"),
            ("non_many_child_non_many_gc", False, False, "book"),
            ("many_child_non_many_gc", True, False, "books_outer"),
        ]
    )
    @override_settings(DEBUG=True)
    def test_deep_nesting_raises_error(
        self, _name, child_many, grandchild_many, expected_field
    ):
        """All deep-nesting shapes (nested-in-nested) raise at viewset instantiation."""
        GC = make_serializer(id=serializers.CharField())
        gc_field = "grandchildren" if grandchild_many else "grandchild"
        gc_kwargs = {"many": True} if grandchild_many else {}
        ChildSer = make_serializer(
            id=serializers.CharField(), **{gc_field: GC(**gc_kwargs)}
        )
        child_field = "books_outer" if child_many else "book"
        child_kwargs = (
            {"many": True, "source": "books"} if child_many else {"source": "books"}
        )
        ParentSer = make_serializer(
            id=serializers.CharField(),
            **{child_field: ChildSer(**child_kwargs)},
        )
        with self.assertRaises(TypeError) as ctx:
            make_viewset(serializer_class=ParentSer)
        self.assertIn(expected_field, str(ctx.exception))

    def test_deep_nesting_with_deferred_avoids_error(self):
        """Deferring the deeply-nested field lets derivation succeed."""
        GC = make_serializer(id=serializers.CharField())
        ChildSer = make_serializer(
            id=serializers.CharField(), grandchildren=GC(many=True)
        )
        ParentSer = make_serializer(
            id=serializers.CharField(),
            books_outer=ChildSer(many=True, source="books"),
        )
        with override_settings(DEBUG=True):
            viewset = make_viewset(
                serializer_class=ParentSer,
                deferred_fields=("books_outer",),
            )
        result = _serialize(viewset, [{"id": "a1"}])
        self.assertNotIn("books_outer", result[0])

    @override_settings(DEBUG=True)
    def test_validate_raises_on_drift_in_flat_output(self):
        """consolidate() adding a field not on the serializer raises ValueError."""
        Ser = make_serializer(id=serializers.CharField(), name=serializers.CharField())

        class V(BaseValuesViewset, ListModelMixin):
            queryset = Author.objects.none()
            serializer_class = Ser

            def consolidate(self, items, queryset):
                for item in items:
                    item["unexpected"] = "oops"
                return items

        _assert_serialize_raises(
            self, V(), [{"id": "a1", "name": "Alice"}], "unexpected"
        )

    @override_settings(DEBUG=True)
    def test_validate_raises_on_drift_in_nested_many_output(self):
        """consolidate() producing a nested many item missing a field raises."""
        Ser = make_serializer(
            id=serializers.CharField(), books=BookSerializer(many=True)
        )

        class V(BaseValuesViewset, ListModelMixin):
            queryset = Author.objects.none()
            serializer_class = Ser

            def consolidate(self, items, queryset):
                for item in items:
                    item["books"] = [{"id": "b1"}]  # missing 'title'
                return items

        _assert_serialize_raises(
            self,
            V(),
            [{"id": "a1", "books__id": "b1", "books__title": "B1"}],
            "title",
        )

    @override_settings(DEBUG=True)
    def test_validate_raises_on_drift_in_nested_single_output(self):
        """consolidate() producing a nested dict missing a field raises."""
        Ser = make_serializer(
            model=Book,
            id=serializers.CharField(),
            author=make_nested(
                model=Author,
                id=serializers.CharField(),
                name=serializers.CharField(),
            ),
        )

        class V(BaseValuesViewset, ListModelMixin):
            queryset = Book.objects.none()
            serializer_class = Ser

            def consolidate(self, items, queryset):
                for item in items:
                    item["author"] = {"id": "a1"}  # missing 'name'
                return items

        _assert_serialize_raises(
            self,
            V(),
            [{"id": "b1", "author__id": "a1", "author__name": "Alice"}],
            "name",
        )

    @override_settings(DEBUG=True)
    def test_validate_catches_consolidate_deleting_a_field(self):
        """consolidate() removing a declared field raises."""
        Ser = make_serializer(id=serializers.CharField(), name=serializers.CharField())

        class V(BaseValuesViewset, ListModelMixin):
            queryset = Author.objects.none()
            serializer_class = Ser

            def consolidate(self, items, queryset):
                for item in items:
                    del item["name"]
                return items

        _assert_serialize_raises(self, V(), [{"id": "a1", "name": "Alice"}], "name")

    @override_settings(DEBUG=True)
    def test_validate_ignores_write_only_fields(self):
        """write_only fields missing from output don't trigger validation errors."""
        viewset = make_viewset(
            id=serializers.CharField(),
            email=serializers.CharField(write_only=True),
        )
        result = _serialize(viewset, [{"id": "a1"}])
        self.assertEqual(result[0], {"id": "a1"})

    @override_settings(DEBUG=True)
    def test_validate_does_not_crash_on_listfield_child(self):
        """ListField(child=CharField()) in serializer doesn't crash validation.

        ListField's child is a plain Field, not a Serializer — the validator
        must not recurse into it as a nested schema.
        """
        Ser = make_serializer(
            id=serializers.CharField(),
            book_titles=serializers.ListField(child=serializers.CharField()),
        )

        class V(BaseValuesViewset, ListModelMixin):
            queryset = Author.objects.none()
            serializer_class = Ser
            deferred_fields = ("book_titles",)

            def consolidate(self, items, queryset):
                for item in items:
                    item["book_titles"] = ["B1", "B2"]
                return items

        result = _serialize(V(), [{"id": "a1"}])
        self.assertEqual(result[0]["book_titles"], ["B1", "B2"])

    @override_settings(DEBUG=True)
    def test_explicit_values_viewset_skips_output_validation(self):
        """Legacy explicit-values viewsets often pair a write-oriented
        serializer_class with a different read shape — DEBUG output
        validation must not apply to them."""
        Ser = make_serializer(id=serializers.CharField(), name=serializers.CharField())

        class V(BaseValuesViewset, ListModelMixin):
            queryset = Author.objects.none()
            serializer_class = Ser
            values = ("id",)

        result = _serialize(V(), [{"id": "a1"}])
        self.assertEqual(result[0], {"id": "a1"})

    def test_explicit_values_viewset_skips_validation_fallback(self):
        """Even with no cached schema (class initialized under DEBUG=False),
        the runtime fallback must not validate explicit-values viewsets."""
        Ser = make_serializer(id=serializers.CharField(), name=serializers.CharField())

        class V(BaseValuesViewset, ListModelMixin):
            queryset = Author.objects.none()
            serializer_class = Ser
            values = ("id",)

        viewset = V()  # initialized with DEBUG=False — no cached schema
        with override_settings(DEBUG=True):
            result = _serialize(viewset, [{"id": "a1"}])
        self.assertEqual(result[0], {"id": "a1"})

    @override_settings(DEBUG=False)
    def test_validation_skipped_when_debug_false(self):
        """DEBUG=False — drifting output passes silently."""
        Ser = make_serializer(id=serializers.CharField(), name=serializers.CharField())

        class V(BaseValuesViewset, ListModelMixin):
            queryset = Author.objects.none()
            serializer_class = Ser

            def consolidate(self, items, queryset):
                for item in items:
                    item["extra"] = "ignored"
                return items

        result = _serialize(V(), [{"id": "a1", "name": "Alice"}])
        self.assertEqual(result[0]["extra"], "ignored")

    @override_settings(DEBUG=True)
    def test_scalar_many_passes_validation(self):
        """Scalar-many fields should not trip DEBUG validation (flat list, not dict)."""
        viewset = make_viewset(
            id=serializers.CharField(),
            book_titles=serializers.CharField(source="books.title"),
        )
        result = _serialize(
            viewset,
            [
                {"id": "a1", "books__title": "B1"},
                {"id": "a2", "books__title": None},
            ],
        )
        self.assertEqual(len(result), 2)

    def test_missing_nested_pk_raises_descriptive_error(self):
        """Missing nested-pk key in a row raises with field + key identification."""
        viewset = author_books_viewset()
        viewset.__class__._joined_many = (("books", "nonexistent_pk"),)

        flat_items = [
            {"id": "a1", "books__id": "b1", "books__title": "B1"},
            {"id": "a1", "books__id": "b2", "books__title": "B2"},
        ]
        with self.assertRaises(KeyError) as ctx:
            viewset.serialize(create_mock_queryset(flat_items))
        msg = str(ctx.exception)
        self.assertIn("books", msg)
        self.assertIn("nonexistent_pk", msg)
        self.assertIn("_auto_consolidate", msg)

    def test_missing_source_key_raises_key_error(self):
        """A field_map entry pointing at a source absent from the row fails fast.

        Misconfigured mappings raise KeyError during serialize() rather than
        silently producing None — so a typo in ``field_map`` surfaces at the
        first request rather than propagating as bad output.
        """

        class V(BaseValuesViewset, ListModelMixin):
            queryset = Author.objects.none()
            values = ("id",)
            field_map = {"display_name": "nonexistent"}

        with self.assertRaises(KeyError):
            _serialize(V(), [{"id": "a1"}])


class TestAuxiliaryAPIs(TestCase):
    """Surfaces beyond ``serialize()``: nested serializer lookup,
    separate-queryset serialization (``serialize_queryset``), deferred-field
    filtering, and lazy queryset resolution when no class-level ``queryset``
    is defined.
    """

    def test_get_nested_serializer_direct_path(self):
        """Direct nested path returns the corresponding child serializer."""
        viewset = author_books_viewset()
        nested = viewset.get_nested_serializer("books")
        self.assertIn("id", nested.fields)
        self.assertIn("title", nested.fields)

    def test_get_nested_serializer_doubly_nested_path(self):
        """Dotted path (e.g., 'books__tags') resolves through deferred nested serializers."""
        TagSer = make_serializer(
            model=Tag,
            id=serializers.CharField(),
            name=serializers.CharField(),
        )
        BookSer = make_serializer(
            model=Book,
            id=serializers.CharField(),
            tags=TagSer(many=True),
        )
        viewset = make_viewset(
            serializer_class=make_serializer(
                id=serializers.CharField(), books=BookSer(many=True)
            ),
            deferred_fields=("books",),
        )
        nested = viewset.get_nested_serializer("books__tags")
        self.assertEqual(set(nested.fields), {"id", "name"})

    def test_get_nested_serializer_invalid_path_raises(self):
        """A path that doesn't resolve raises KeyError."""
        viewset = make_viewset(id=serializers.CharField())
        with self.assertRaises(KeyError):
            viewset.get_nested_serializer("nonexistent")

    def test_serialize_queryset_returns_list_of_items(self):
        """serialize_queryset without group_by returns a flat list."""
        viewset = author_books_viewset(deferred=True)
        qs = MagicMock()
        qs.values.return_value = [
            {"id": "b1", "title": "B1"},
            {"id": "b2", "title": "B2"},
        ]
        result = viewset.serialize_queryset(qs, "books")
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]["title"], "B1")

    def test_deferred_field_excluded_from_values_call(self):
        """Fields in deferred_fields are not requested in the main values() call."""
        viewset = author_books_viewset(deferred=True, email=serializers.CharField())
        mock_qs = create_mock_queryset([{"id": "a1", "email": "alice@example.com"}])
        result = viewset.serialize(mock_qs)
        values_args = mock_qs.values.call_args[0]
        self.assertIn("id", values_args)
        self.assertIn("email", values_args)
        self.assertNotIn("books__id", values_args)
        self.assertNotIn("books__title", values_args)
        self.assertNotIn("books", result[0])

    def test_auto_consolidate_works_without_class_level_queryset(self):
        """Viewsets using get_queryset() (no class queryset) still resolve PK lazily."""
        Ser = make_serializer(
            id=serializers.CharField(),
            books=make_nested(
                model=Book,
                many=True,
                id=serializers.CharField(),
                title=serializers.CharField(),
            ),
        )

        class V(BaseValuesViewset, ListModelMixin):
            serializer_class = Ser

            def get_queryset(self):
                return Author.objects.none()

        flat_items = [
            {"id": "a1", "books__id": "b1", "books__title": "B1"},
            {"id": "a1", "books__id": "b2", "books__title": "B2"},
        ]
        result = _serialize(V(), flat_items)
        self.assertEqual(len(result[0]["books"]), 2)
