import datetime
import uuid
from typing import Type
from unittest.mock import MagicMock

from django.db import connection
from django.db.models import Model
from django.test import override_settings
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework import serializers

from kolibri.core.api import BaseValuesViewset
from kolibri.core.api import ListModelMixin
from kolibri.core.api import ValuesMethodField
from kolibri.core.api import ValuesViewsetOrderingFilter
from kolibri.core.serializers import HexOnlyUUIDField
from kolibri.core.test.test_app.models import Author
from kolibri.core.test.test_app.models import Award
from kolibri.core.test.test_app.models import Book
from kolibri.core.test.test_app.models import Classroom
from kolibri.core.test.test_app.models import Country
from kolibri.core.test.test_app.models import DateTimeTzModel
from kolibri.core.test.test_app.models import Enrollment
from kolibri.core.test.test_app.models import Hideable
from kolibri.core.test.test_app.models import HideableAccount
from kolibri.core.test.test_app.models import HideableOwner
from kolibri.core.test.test_app.models import Profile
from kolibri.core.test.test_app.models import Publisher
from kolibri.core.test.test_app.models import Review
from kolibri.core.test.test_app.models import Tag
from kolibri.core.utils.values_viewset import OutputValidationError


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
AwardSerializer = make_serializer(
    model=Award, id=serializers.CharField(), name=serializers.CharField()
)
ReviewSerializer = make_serializer(
    model=Review, id=serializers.CharField(), rating=serializers.IntegerField()
)
CountrySerializer = make_serializer(
    model=Country, id=serializers.CharField(), name=serializers.CharField()
)
PublisherSerializer = make_serializer(
    model=Publisher, id=serializers.CharField(), name=serializers.CharField()
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
    """Assert serialize() raises OutputValidationError containing expected_substr."""
    mock_qs = create_mock_queryset(flat_items)
    with test_case.assertRaises(OutputValidationError) as ctx:
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

    - Authors: alice/bob (main_publisher), carol (no publisher).
    - Profiles: alice_profile (verified), bob_profile (unverified) — OneToOne rev.
    - Books: book_a1/book_a2/book_a3 (alice), book_b1 (bob) — reverse FK many.
    - Tags: tag_fiction, tag_classic — M2M fwd (book_a1 has both, book_a2 fiction).
    - Classrooms/Enrollments: classroom_101/102, alice in both — M2M-through.
    - Awards: award_alice_best/award_alice_honorable (alice), award_bob (bob) — second reverse FK many on Author.
    - Reviews: review_a1_1/review_a1_2 on book_a1, review_a2_1 on book_a2, none on book_a3 — grandchild reverse FK many on Book.
    - Publisher countries: main_publisher→country_uk (UK), indie_publisher→country_us (US).
    - Book publishers: book_a1/book_a2→main_publisher, book_b1→indie_publisher, book_a3→None.
    """

    @classmethod
    def setUpTestData(cls):
        cls.country_uk = Country.objects.create(name="UK")
        cls.country_us = Country.objects.create(name="US")

        cls.main_publisher = Publisher.objects.create(
            name="Main House", country=cls.country_uk
        )
        cls.indie_publisher = Publisher.objects.create(
            name="Indie", country=cls.country_us
        )

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

        cls.book_a1 = Book.objects.create(
            author=cls.alice, title="Alice Book 1", publisher=cls.main_publisher
        )
        cls.book_a2 = Book.objects.create(
            author=cls.alice, title="Alice Book 2", publisher=cls.main_publisher
        )
        cls.book_a3 = Book.objects.create(
            author=cls.alice, title="Alice Book 3", description=None, publisher=None
        )
        cls.book_b1 = Book.objects.create(
            author=cls.bob, title="Bob Book 1", publisher=cls.indie_publisher
        )

        cls.tag_fiction = Tag.objects.create(name="fiction")
        cls.tag_classic = Tag.objects.create(name="classic")
        cls.book_a1.tags.add(cls.tag_fiction, cls.tag_classic)
        cls.book_a2.tags.add(cls.tag_fiction)

        cls.classroom_101 = Classroom.objects.create(name="Room 101")
        cls.classroom_102 = Classroom.objects.create(name="Room 102")
        Enrollment.objects.create(author=cls.alice, classroom=cls.classroom_101)
        Enrollment.objects.create(author=cls.alice, classroom=cls.classroom_102)

        cls.award_alice_best = Award.objects.create(author=cls.alice, name="Best")
        cls.award_alice_honorable = Award.objects.create(
            author=cls.alice, name="Honorable"
        )
        cls.award_bob = Award.objects.create(author=cls.bob, name="Notable")

        cls.review_a1_1 = Review.objects.create(book=cls.book_a1, rating=5)
        cls.review_a1_2 = Review.objects.create(book=cls.book_a1, rating=4)
        cls.review_a2_1 = Review.objects.create(book=cls.book_a2, rating=3)

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
            model=Book,
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

    def test_reverse_fk_single_nested(self):
        """A reverse FK declared without many= renders one child, not a list —
        the shape the serializer asked for, over a relation that can hold
        several."""
        viewset = make_viewset(
            queryset=Author.objects.filter(pk=self.bob.pk),
            id=serializers.UUIDField(),
            books=make_nested(
                model=Book,
                id=serializers.IntegerField(),
                title=serializers.CharField(),
            ),
        )
        result = self._run(viewset)
        self.assertEqual(result[0]["books"]["title"], "Bob Book 1")

    def test_reverse_fk_single_nested_null_without_children(self):
        viewset = make_viewset(
            queryset=Author.objects.filter(pk=self.carol.pk),
            id=serializers.UUIDField(),
            books=make_nested(
                model=Book,
                allow_null=True,
                id=serializers.IntegerField(),
                title=serializers.CharField(),
            ),
        )
        result = self._run(viewset)
        self.assertIsNone(result[0]["books"])

    def test_reverse_fk_single_excludes_hidden_via_default_manager(self):
        """The manager follows the relation, not the declared output shape: a
        reverse FK rendered singly still hides what its related manager hides."""
        owner = HideableOwner.objects.create(name="owner")
        Hideable.objects.create(name="secret", hidden=True, owner=owner)
        viewset = make_viewset(
            model=HideableOwner,
            queryset=HideableOwner.objects.filter(pk=owner.pk),
            id=serializers.IntegerField(),
            hideables=make_nested(
                model=Hideable,
                allow_null=True,
                id=serializers.IntegerField(),
                name=serializers.CharField(),
            ),
        )
        result = self._run(viewset)
        self.assertIsNone(result[0]["hideables"])

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

    def test_m2m_through_duplicate_rows_yield_one_child(self):
        """Two through-rows for the same pair return the child twice from the
        join; it must still appear once under its parent."""
        Enrollment.objects.create(author=self.alice, classroom=self.classroom_101)

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

    # Manager choice: auto-fetch must mirror Django's relation descriptors —
    # to-one relations (forward FK, reverse O2O) load through the target's base
    # manager, to-many relations (reverse FK, M2M) through its default manager.

    def test_forward_fk_fetches_hidden_target_via_base_manager(self):
        """A forward FK is loaded through the base manager (Django's
        ForwardManyToOneDescriptor), so a soft-delete-style default-manager
        filter on the target model can't null out a referenced row."""
        hidden = Hideable.objects.create(name="secret", hidden=True)
        owner = HideableOwner.objects.create(name="owner", featured=hidden)
        viewset = make_viewset(
            model=HideableOwner,
            queryset=HideableOwner.objects.filter(pk=owner.pk),
            id=serializers.IntegerField(),
            featured=make_nested(
                model=Hideable,
                allow_null=True,
                id=serializers.IntegerField(),
                name=serializers.CharField(),
            ),
        )
        result = self._run(viewset)
        self.assertIsNotNone(result[0]["featured"])
        self.assertEqual(result[0]["featured"]["name"], "secret")

    def test_reverse_o2o_fetches_hidden_target_via_base_manager(self):
        """Reverse OneToOne loads through the base manager (Django's
        ReverseOneToOneDescriptor), so a hidden target still serializes."""
        owner = HideableOwner.objects.create(name="owner")
        Hideable.objects.create(name="secret", hidden=True, solo_owner=owner)
        viewset = make_viewset(
            model=HideableOwner,
            queryset=HideableOwner.objects.filter(pk=owner.pk),
            id=serializers.IntegerField(),
            solo_hideable=make_nested(
                model=Hideable,
                allow_null=True,
                id=serializers.IntegerField(),
                name=serializers.CharField(),
            ),
        )
        result = self._run(viewset)
        self.assertIsNotNone(result[0]["solo_hideable"])
        self.assertEqual(result[0]["solo_hideable"]["name"], "secret")

    def test_reverse_fk_many_excludes_hidden_via_default_manager(self):
        """Reverse FK many uses the target's default manager (matching the
        related manager Django builds), so hidden children are excluded."""
        owner = HideableOwner.objects.create(name="owner")
        Hideable.objects.create(name="visible", owner=owner)
        Hideable.objects.create(name="secret", hidden=True, owner=owner)
        viewset = make_viewset(
            model=HideableOwner,
            queryset=HideableOwner.objects.filter(pk=owner.pk),
            id=serializers.IntegerField(),
            hideables=make_nested(
                model=Hideable,
                many=True,
                id=serializers.IntegerField(),
                name=serializers.CharField(),
            ),
        )
        result = self._run(viewset)
        names = sorted(h["name"] for h in result[0]["hideables"])
        self.assertEqual(names, ["visible"])

    def test_m2m_excludes_hidden_via_default_manager(self):
        """M2M uses the target's default manager, so hidden children are
        excluded (matching Django's M2M related manager)."""
        owner = HideableOwner.objects.create(name="owner")
        visible = Hideable.objects.create(name="visible")
        secret = Hideable.objects.create(name="secret", hidden=True)
        owner.tagged.add(visible, secret)
        viewset = make_viewset(
            model=HideableOwner,
            queryset=HideableOwner.objects.filter(pk=owner.pk),
            id=serializers.IntegerField(),
            tagged=make_nested(
                model=Hideable,
                many=True,
                id=serializers.IntegerField(),
                name=serializers.CharField(),
            ),
        )
        result = self._run(viewset)
        names = sorted(h["name"] for h in result[0]["tagged"])
        self.assertEqual(names, ["visible"])

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

    def test_scalar_many_via_to_one_then_to_many(self):
        """Scalar source crossing a to-one *then* a to-many
        (``publisher.books.title``)."""
        viewset = make_viewset(
            queryset=Author.objects.filter(pk=self.alice.pk),
            id=serializers.UUIDField(),
            publisher_book_titles=serializers.CharField(source="publisher.books.title"),
        )
        with self.assertNumQueries(2):
            result = self._run(viewset)
        self.assertEqual(
            sorted(result[0]["publisher_book_titles"]),
            ["Alice Book 1", "Alice Book 2"],
        )

    def test_scalar_many_via_to_one_then_to_many_excludes_hidden(self):
        """Scalar source crossing a to-one then a to-many onto a filtered model
        (``owner.hideables.name``): the to-many's default manager applies, so a
        hidden row's value drops out. Still one fetch query."""
        owner = HideableOwner.objects.create(name="owner")
        Hideable.objects.create(name="visible", owner=owner)
        Hideable.objects.create(name="secret", hidden=True, owner=owner)
        account = HideableAccount.objects.create(name="acct", owner=owner)
        viewset = make_viewset(
            model=HideableAccount,
            queryset=HideableAccount.objects.filter(pk=account.pk),
            id=serializers.IntegerField(),
            hideable_names=serializers.CharField(source="owner.hideables.name"),
        )
        with self.assertNumQueries(2):
            result = self._run(viewset)
        self.assertEqual(result[0]["hideable_names"], ["visible"])

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

    def test_forward_fk_source_column_not_leaked_when_undeclared(self):
        """A forward-FK nested serializer whose source column isn't itself a
        declared field must not leak that FK column into the output.

        The FK column is fetched only to key the deferred fetch. On the
        all-passthrough (noop) path map_row returned the raw row untouched, so
        the undeclared source column ("publisher") survived alongside the nested
        field ("publisher_info").
        """
        viewset = make_viewset(
            queryset=Author.objects.filter(pk=self.alice.pk),
            id=serializers.UUIDField(),
            name=serializers.CharField(),
            publisher_info=make_nested(
                model=Publisher,
                source="publisher",
                id=serializers.IntegerField(),
                name=serializers.CharField(),
            ),
        )
        with self.assertNumQueries(2):
            result = self._run(viewset)
        self.assertEqual(set(result[0].keys()), {"id", "name", "publisher_info"})
        self.assertEqual(result[0]["publisher_info"]["name"], "Main House")

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
        """A nested many and a scalar-many on the same parent each resolve to
        their own child count via independent batched queries."""
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
        """Repeated scalar values collapse to unique entries."""
        Book.objects.create(author=self.alice, title="Alice Book 1")
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

    def test_scalar_many_null_produces_empty_list(self):
        """Scalar-many with no related rows yields []."""
        viewset = make_viewset(
            queryset=Author.objects.filter(pk=self.carol.pk),
            id=serializers.UUIDField(),
            book_titles=serializers.CharField(source="books.title"),
        )
        result = self._run(viewset)
        self.assertEqual(result[0]["book_titles"], [])

    # Auto-defer behaviour tests

    def test_auto_defer_multi_many_two_reverse_fk(self):
        """Two many=True reverse-FK nested serializers auto-defer; parent+books+awards = 3 queries."""
        Ser = make_serializer(
            id=serializers.CharField(),
            books=BookSerializer(many=True),
            awards=AwardSerializer(many=True),
        )
        viewset = make_viewset(
            serializer_class=Ser,
            queryset=Author.objects.filter(
                pk__in=[self.alice.pk, self.bob.pk]
            ).order_by("name"),
        )
        with self.assertNumQueries(3):
            result = viewset.serialize(viewset.get_queryset())
        alice, bob = result
        self.assertEqual(
            sorted(b["title"] for b in alice["books"]),
            ["Alice Book 1", "Alice Book 2", "Alice Book 3"],
        )
        self.assertEqual(
            sorted(a["name"] for a in alice["awards"]), ["Best", "Honorable"]
        )
        self.assertEqual([a["name"] for a in bob["awards"]], ["Notable"])

    def test_auto_defer_multi_many_hex_uuid_parent_pk(self):
        """HexOnlyUUIDField parent: bucket on the raw (hyphenated) pk, not the
        rendered 32-char hex, or every child comes back [].
        parent + books + awards + classrooms = 4 queries."""
        Ser = make_serializer(
            id=HexOnlyUUIDField(),
            books=BookSerializer(many=True),
            awards=AwardSerializer(many=True),
            classrooms=ClassroomSerializer(many=True),
        )
        viewset = make_viewset(
            serializer_class=Ser,
            queryset=Author.objects.filter(
                pk__in=[self.alice.pk, self.bob.pk]
            ).order_by("name"),
        )
        with self.assertNumQueries(4):
            result = viewset.serialize(viewset.get_queryset())
        alice, bob = result
        self.assertEqual(
            sorted(b["title"] for b in alice["books"]),
            ["Alice Book 1", "Alice Book 2", "Alice Book 3"],
        )
        self.assertEqual(
            sorted(a["name"] for a in alice["awards"]), ["Best", "Honorable"]
        )
        self.assertEqual(
            sorted(c["name"] for c in alice["classrooms"]),
            ["Room 101", "Room 102"],
        )
        self.assertEqual([b["title"] for b in bob["books"]], ["Bob Book 1"])
        self.assertEqual([a["name"] for a in bob["awards"]], ["Notable"])
        self.assertEqual(bob["classrooms"], [])

    def test_auto_defer_multi_many_with_m2m(self):
        """One reverse-FK + one M2M-through nested serializer auto-defer; parent+books+classrooms = 3 queries."""
        Ser = make_serializer(
            id=serializers.CharField(),
            books=BookSerializer(many=True),
            classrooms=ClassroomSerializer(many=True),
        )
        viewset = make_viewset(
            serializer_class=Ser,
            queryset=Author.objects.filter(pk=self.alice.pk),
        )
        with self.assertNumQueries(3):
            result = viewset.serialize(viewset.get_queryset())
        self.assertEqual(len(result), 1)
        alice = result[0]
        self.assertEqual(
            sorted(b["title"] for b in alice["books"]),
            ["Alice Book 1", "Alice Book 2", "Alice Book 3"],
        )
        self.assertEqual(
            sorted(c["name"] for c in alice["classrooms"]),
            ["Room 101", "Room 102"],
        )

    def test_auto_defer_multi_many_without_pk_in_output(self):
        """Reverse-FK/M2M children bucket correctly when the serializer omits
        the parent pk from its output."""
        Ser = make_serializer(
            name=serializers.CharField(),
            books=BookSerializer(many=True),
            awards=AwardSerializer(many=True),
        )
        viewset = make_viewset(
            serializer_class=Ser,
            queryset=Author.objects.filter(
                pk__in=[self.alice.pk, self.bob.pk]
            ).order_by("name"),
        )
        result = viewset.serialize(viewset.get_queryset())
        alice, bob = result
        # pk is not declared output: stripped, but bucketing still works.
        self.assertEqual(set(alice), {"name", "books", "awards"})
        self.assertEqual(
            sorted(b["title"] for b in alice["books"]),
            ["Alice Book 1", "Alice Book 2", "Alice Book 3"],
        )
        self.assertEqual(
            sorted(a["name"] for a in alice["awards"]), ["Best", "Honorable"]
        )
        self.assertEqual([a["name"] for a in bob["awards"]], ["Notable"])

    def test_auto_defer_forward_fk_target_without_pk_in_output(self):
        """A deferred forward-FK target serializer that omits its pk resolves."""
        PublisherNoId = make_serializer(
            model=Publisher,
            name=serializers.CharField(),
            country=CountrySerializer(allow_null=True),
        )
        Ser = make_serializer(
            id=serializers.CharField(),
            publisher=PublisherNoId(allow_null=True),
        )
        viewset = make_viewset(
            serializer_class=Ser,
            queryset=Author.objects.filter(pk=self.alice.pk),
        )
        result = viewset.serialize(viewset.get_queryset())
        pub = result[0]["publisher"]
        self.assertEqual(set(pub), {"name", "country"})
        self.assertEqual(pub["name"], "Main House")
        self.assertEqual(pub["country"]["name"], "UK")

    def test_auto_defer_forward_fk_leaf_target_without_pk(self):
        """A pk-less leaf forward-FK target resolves when reached as a
        forward-need target inside a deferred subtree."""
        PublisherLeaf = make_serializer(model=Publisher, name=serializers.CharField())
        BookWithPub = make_serializer(
            model=Book,
            id=serializers.IntegerField(),
            title=serializers.CharField(),
            publisher=PublisherLeaf(allow_null=True),
        )
        Ser = make_serializer(
            id=serializers.CharField(),
            books=BookWithPub(many=True),
        )
        viewset = make_viewset(
            serializer_class=Ser,
            queryset=Author.objects.filter(pk=self.alice.pk),
        )
        result = viewset.serialize(viewset.get_queryset())
        books = result[0]["books"]
        pub_names = {b["publisher"]["name"] for b in books if b["publisher"]}
        self.assertIn("Main House", pub_names)
        self.assertTrue(
            all(set(b["publisher"]) == {"name"} for b in books if b["publisher"])
        )

    def test_auto_defer_reverse_children_without_pk_in_output(self):
        """Reverse-FK/M2M child serializers that omit their pk still bucket."""
        TagNoId = make_serializer(model=Tag, name=serializers.CharField())
        ReviewNoId = make_serializer(model=Review, rating=serializers.IntegerField())
        Ser = make_serializer(
            model=Book,
            id=serializers.IntegerField(),
            title=serializers.CharField(),
            tags=TagNoId(many=True),
            reviews=ReviewNoId(many=True),
        )
        viewset = make_viewset(
            serializer_class=Ser,
            queryset=Book.objects.filter(pk=self.book_a1.pk),
        )
        result = viewset.serialize(viewset.get_queryset())
        book = result[0]
        self.assertEqual(
            sorted(t["name"] for t in book["tags"]), ["classic", "fiction"]
        )
        self.assertEqual(sorted(r["rating"] for r in book["reviews"]), [4, 5])
        self.assertTrue(all(set(t) == {"name"} for t in book["tags"]))

    def test_auto_defer_many_without_pk_in_output(self):
        """An auto-deferred many=True populates even when the parent omits its pk."""
        Ser = make_serializer(
            name=serializers.CharField(),
            books=BookSerializer(many=True),
        )
        viewset = make_viewset(
            serializer_class=Ser,
            queryset=Author.objects.filter(pk=self.alice.pk),
        )
        result = viewset.serialize(viewset.get_queryset())
        alice = result[0]
        self.assertEqual(set(alice), {"name", "books"})
        self.assertEqual(
            sorted(b["title"] for b in alice["books"]),
            ["Alice Book 1", "Alice Book 2", "Alice Book 3"],
        )

    def test_auto_defer_deep_nesting_many_outer(self):
        """Deep nesting: books(many){tags(many)} both auto-defer; authors+books+tags = 3 queries."""
        BookWithTagsSer = make_serializer(
            model=Book,
            id=serializers.IntegerField(),
            title=serializers.CharField(),
            tags=TagSerializer(many=True),
        )
        Ser = make_serializer(
            id=serializers.CharField(),
            books=BookWithTagsSer(many=True),
        )
        viewset = make_viewset(
            serializer_class=Ser,
            queryset=Author.objects.filter(pk=self.alice.pk),
        )
        with self.assertNumQueries(3):
            result = viewset.serialize(viewset.get_queryset())
        alice = result[0]
        books_by_id = {b["id"]: b for b in alice["books"]}
        self.assertEqual(
            sorted(t["name"] for t in books_by_id[self.book_a1.pk]["tags"]),
            ["classic", "fiction"],
        )
        self.assertEqual(books_by_id[self.book_a3.pk]["tags"], [])

    def test_auto_defer_single_fk_deep_nesting(self):
        """Forward-FK with nested forward-FK auto-defers; authors+publishers+countries = 3 queries."""
        PublisherWithCountrySer = make_serializer(
            model=Publisher,
            id=serializers.IntegerField(),
            name=serializers.CharField(),
            country=CountrySerializer(allow_null=True),
        )
        Ser = make_serializer(
            id=serializers.CharField(),
            publisher=PublisherWithCountrySer(allow_null=True),
        )
        viewset = make_viewset(
            serializer_class=Ser,
            queryset=Author.objects.filter(
                pk__in=[self.alice.pk, self.bob.pk, self.carol.pk]
            ).order_by("name"),
        )
        with self.assertNumQueries(3):
            result = viewset.serialize(viewset.get_queryset())
        alice_row = next(
            r
            for r in result
            if r["publisher"] and r["publisher"]["name"] == "Main House"
        )
        self.assertEqual(alice_row["publisher"]["country"]["name"], "UK")
        carol_row = next(r for r in result if r["publisher"] is None)
        self.assertIsNone(carol_row["publisher"])

    def test_auto_defer_does_not_bind_a_parameter_per_parent(self):
        """A deferred fetch must not bind one parameter per parent, or an
        unpaginated list blows SQLite's statement variable cap.

        Asserted on parameter counts, not an ``OperationalError``: only a SQLite
        older than 3.32 raises at 999.
        """
        authors = Author.objects.bulk_create(
            Author(name="Bulk {:04d}".format(i), publisher=self.main_publisher)
            for i in range(1200)
        )
        Book.objects.bulk_create(
            Book(author=author, title="Bulk book {}".format(author.name))
            for author in authors
        )
        Ser = make_serializer(
            id=serializers.CharField(),
            books=make_nested(
                model=Book,
                many=True,
                id=serializers.IntegerField(),
                title=serializers.CharField(),
            ),
            publisher=make_nested(
                model=Publisher,
                allow_null=True,
                id=serializers.IntegerField(),
                name=serializers.CharField(),
            ),
        )
        viewset = make_viewset(
            serializer_class=Ser,
            queryset=Author.objects.filter(name__startswith="Bulk").order_by("name"),
        )
        bound = []

        def record_params(execute, sql, params, many, context):
            bound.append(len(params or ()))
            return execute(sql, params, many, context)

        with connection.execute_wrapper(record_params):
            with self.assertNumQueries(3):
                result = viewset.serialize(viewset.get_queryset())

        self.assertLess(max(bound), 999)
        self.assertEqual(len(result), 1200)
        self.assertEqual(result[0]["books"][0]["title"], "Bulk book Bulk 0000")
        self.assertEqual(result[-1]["publisher"]["name"], "Main House")

    def test_auto_defer_shared_forward_target_merged(self):
        """Shared Publisher FK on Author + Book deduplicates to one Publisher query + one Country query = 4 total."""
        PublisherWithCountrySer = make_serializer(
            model=Publisher,
            id=serializers.IntegerField(),
            name=serializers.CharField(),
            country=CountrySerializer(allow_null=True),
        )
        BookWithPublisherSer = make_serializer(
            model=Book,
            id=serializers.IntegerField(),
            title=serializers.CharField(),
            publisher=PublisherWithCountrySer(allow_null=True),
        )
        Ser = make_serializer(
            id=serializers.CharField(),
            publisher=PublisherWithCountrySer(allow_null=True),
            books=BookWithPublisherSer(many=True),
        )
        viewset = make_viewset(
            serializer_class=Ser,
            queryset=Author.objects.filter(
                pk__in=[self.alice.pk, self.bob.pk]
            ).order_by("name"),
        )
        with self.assertNumQueries(4):
            result = viewset.serialize(viewset.get_queryset())
        alice = result[0]
        self.assertEqual(alice["publisher"]["name"], "Main House")
        book_a1 = next(b for b in alice["books"] if b["title"] == "Alice Book 1")
        self.assertEqual(book_a1["publisher"]["country"]["name"], "UK")
        bob = result[1]
        self.assertEqual(bob["publisher"]["name"], "Main House")
        book_a2 = next(b for b in alice["books"] if b["title"] == "Alice Book 2")
        self.assertEqual(book_a2["publisher"]["name"], "Main House")

    def test_auto_defer_same_model_different_shapes_one_fetch_no_leak(self):
        """Two forward FKs to one model with different field selections. One
        fetch (keyed by model), serialized per shape (keyed by child_path). Rich
        (id, name, country) and lean (id) selections don't leak. Budget: 1
        Publisher + 1 Country."""
        RichPublisherSer = make_serializer(
            model=Publisher,
            id=serializers.IntegerField(),
            name=serializers.CharField(),
            country=CountrySerializer(allow_null=True),
        )
        LeanPublisherSer = make_serializer(
            model=Publisher, id=serializers.IntegerField()
        )
        BookLeanPublisherSer = make_serializer(
            model=Book,
            id=serializers.IntegerField(),
            title=serializers.CharField(),
            publisher=LeanPublisherSer(allow_null=True),
        )
        Ser = make_serializer(
            id=serializers.CharField(),
            publisher=RichPublisherSer(allow_null=True),
            books=BookLeanPublisherSer(many=True),
        )
        viewset = make_viewset(
            serializer_class=Ser,
            queryset=Author.objects.filter(
                pk__in=[self.alice.pk, self.bob.pk]
            ).order_by("name"),
        )
        with CaptureQueriesContext(connection) as ctx:
            result = viewset.serialize(viewset.get_queryset())
        # One fetch per model, despite the two distinct serializers.
        self.assertEqual(
            len(
                [q for q in ctx.captured_queries if "core_tests_publisher" in q["sql"]]
            ),
            1,
        )
        self.assertEqual(
            len([q for q in ctx.captured_queries if "core_tests_country" in q["sql"]]),
            1,
        )
        alice = result[0]
        # Author.publisher keeps the rich shape.
        self.assertEqual(alice["publisher"]["name"], "Main House")
        self.assertEqual(alice["publisher"]["country"]["name"], "UK")
        # Book.publisher keeps the lean shape — no name/country leak.
        book_with_pub = next(b for b in alice["books"] if b["publisher"])
        self.assertEqual(set(book_with_pub["publisher"].keys()), {"id"})

    def test_auto_defer_same_model_different_nested_not_mismerged(self):
        """Two forward FKs to one model whose serializers differ only in nested
        children must not merge. Author.publisher nests books; books' publisher
        nests authors. They share flat columns (id, name), so a nesting-blind
        merge key would serialize one under the other's shape."""
        AuthorMiniSer = make_serializer(
            model=Author, id=serializers.CharField(), name=serializers.CharField()
        )
        PublisherWithBooksSer = make_serializer(
            model=Publisher,
            id=serializers.IntegerField(),
            name=serializers.CharField(),
            books=BookSerializer(many=True),
        )
        PublisherWithAuthorsSer = make_serializer(
            model=Publisher,
            id=serializers.IntegerField(),
            name=serializers.CharField(),
            authors=AuthorMiniSer(many=True),
        )
        BookWithPublisherSer = make_serializer(
            model=Book,
            id=serializers.IntegerField(),
            title=serializers.CharField(),
            publisher=PublisherWithAuthorsSer(allow_null=True),
        )
        Ser = make_serializer(
            id=serializers.CharField(),
            publisher=PublisherWithBooksSer(allow_null=True),
            books=BookWithPublisherSer(many=True),
        )
        viewset = make_viewset(
            serializer_class=Ser,
            queryset=Author.objects.filter(
                pk__in=[self.alice.pk, self.bob.pk]
            ).order_by("name"),
        )
        result = viewset.serialize(viewset.get_queryset())
        alice = result[0]
        # Author.publisher keeps its books-nesting shape.
        self.assertIn("books", alice["publisher"])
        self.assertNotIn("authors", alice["publisher"])
        # Book.publisher keeps its authors-nesting shape — not mismerged to books.
        book_with_pub = next(b for b in alice["books"] if b["publisher"])
        self.assertIn("authors", book_with_pub["publisher"])
        self.assertNotIn("books", book_with_pub["publisher"])

    def test_auto_defer_scalar_subfetch_runs_once_per_path(self):
        """Fetch/serialize split: the model fetch is shared, a nested level's own
        sub-fetches are not. One Publisher serializer (with a ``book_titles``
        scalar-many) sits at Author.publisher and books' publisher. Publisher is
        fetched once (by model), but ``book_titles`` runs per child_path. Budget:
        author + books + merged Publisher + 2 book_titles = 5."""
        PublisherWithTitlesSer = make_serializer(
            model=Publisher,
            id=serializers.IntegerField(),
            name=serializers.CharField(),
            book_titles=serializers.CharField(source="books.title"),
        )
        BookWithPublisherSer = make_serializer(
            model=Book,
            id=serializers.IntegerField(),
            title=serializers.CharField(),
            publisher=PublisherWithTitlesSer(allow_null=True),
        )
        Ser = make_serializer(
            id=serializers.CharField(),
            publisher=PublisherWithTitlesSer(allow_null=True),
            books=BookWithPublisherSer(many=True),
        )
        viewset = make_viewset(
            serializer_class=Ser,
            queryset=Author.objects.filter(
                pk__in=[self.alice.pk, self.bob.pk]
            ).order_by("name"),
        )
        with CaptureQueriesContext(connection) as ctx:
            result = viewset.serialize(viewset.get_queryset())
        self.assertEqual(len(ctx.captured_queries), 5)
        # Publisher fetched once (model-keyed)...
        self.assertEqual(
            len(
                [q for q in ctx.captured_queries if "core_tests_publisher" in q["sql"]]
            ),
            1,
        )
        # ...but the book_titles scalar fetch (filtered on publisher_id) runs
        # per path — twice, not deduped across shapes.
        self.assertEqual(
            len([q for q in ctx.captured_queries if 'publisher_id" IN' in q["sql"]]),
            2,
        )
        alice = result[0]
        self.assertEqual(alice["publisher"]["name"], "Main House")
        self.assertCountEqual(
            alice["publisher"]["book_titles"], ["Alice Book 1", "Alice Book 2"]
        )

    def test_auto_defer_explicit_deferred_left_to_dev(self):
        """Dev-deferred field is untouched by auto-fetch; auto-deferred authored is fetched = 3 queries."""
        BookWithTagsSer = make_serializer(
            model=Book,
            id=serializers.IntegerField(),
            title=serializers.CharField(),
            tags=TagSerializer(many=True),
        )
        Ser = make_serializer(
            id=serializers.CharField(),
            books=BookSerializer(many=True),
            authored=BookWithTagsSer(many=True, source="books"),
        )

        class DevDeferViewset(BaseValuesViewset, ListModelMixin):
            queryset = Author.objects.filter(pk__in=[self.alice.pk, self.bob.pk])
            serializer_class = Ser
            deferred_fields = ("books",)

            def consolidate(self, items, queryset):
                for item in items:
                    item["books"] = ["dev-handled"]
                return items

        viewset = DevDeferViewset()
        with self.assertNumQueries(3):
            result = viewset.serialize(viewset.get_queryset())
        for row in result:
            self.assertEqual(row["books"], ["dev-handled"])
            self.assertIsInstance(row["authored"], list)

    def test_auto_defer_emits_debug_log(self):
        """Auto-defer engine emits DEBUG logs naming the deferred fields."""
        # Logs fire at viewset construction; build inside the capture block.
        with self.assertLogs(
            "kolibri.core.utils.values_viewset.introspect", level="DEBUG"
        ) as log:
            Ser = make_serializer(
                id=serializers.CharField(),
                books=BookSerializer(many=True),
                awards=AwardSerializer(many=True),
            )
            viewset = make_viewset(
                serializer_class=Ser,
                queryset=Author.objects.filter(pk=self.alice.pk),
            )
            viewset.serialize(viewset.get_queryset())
        joined = "\n".join(log.output)
        self.assertIn("books", joined)
        self.assertIn("awards", joined)

    def test_auto_defer_null_forward_target(self):
        """No stray query for null forward FK: carol has no publisher, so only the parent query runs."""
        Ser = make_serializer(
            id=serializers.CharField(),
            publisher=make_nested(
                model=Publisher,
                allow_null=True,
                id=serializers.IntegerField(),
                name=serializers.CharField(),
                country=make_nested(
                    model=Country,
                    allow_null=True,
                    id=serializers.IntegerField(),
                    name=serializers.CharField(),
                ),
            ),
        )
        viewset = make_viewset(
            serializer_class=Ser,
            queryset=Author.objects.filter(pk=self.carol.pk),
        )
        with self.assertNumQueries(1):
            result = viewset.serialize(viewset.get_queryset())
        self.assertEqual(len(result), 1)
        self.assertIsNone(result[0]["publisher"])

    def test_auto_defer_honours_deep_explicit_defer(self):
        """A forward FK explicitly deferred 3 levels deep is NOT auto-fetched.

        Framework auto-fetches author_data + publisher, leaves country to the
        dev = 3 queries. If the deep explicit path leaks, country is
        auto-fetched (4 queries) and overwrites the dev's value.
        """
        Ser = make_serializer(
            model=Profile,
            id=serializers.IntegerField(),
            author_data=make_nested(
                model=Author,
                source="author",
                id=serializers.CharField(),
                name=serializers.CharField(),
                publisher=make_nested(
                    model=Publisher,
                    allow_null=True,
                    id=serializers.IntegerField(),
                    name=serializers.CharField(),
                    country=make_nested(
                        model=Country,
                        allow_null=True,
                        id=serializers.IntegerField(),
                        name=serializers.CharField(),
                    ),
                ),
            ),
        )

        class DeepDeferViewset(BaseValuesViewset, ListModelMixin):
            queryset = Profile.objects.filter(
                author__in=[self.alice.pk, self.bob.pk]
            ).order_by("pk")
            serializer_class = Ser
            deferred_fields = ("author_data__publisher__country",)

            def consolidate(self, items, queryset):
                for item in items:
                    publisher = item["author_data"]["publisher"]
                    if publisher is not None:
                        publisher["country"] = "dev-handled"
                return items

        viewset = DeepDeferViewset()
        with self.assertNumQueries(3):
            result = viewset.serialize(viewset.get_queryset())
        self.assertEqual(len(result), 2)
        for row in result:
            self.assertEqual(row["author_data"]["publisher"]["name"], "Main House")
            self.assertEqual(row["author_data"]["publisher"]["country"], "dev-handled")

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

    def test_field_reading_a_column_another_field_writes_sees_it_raw(self):
        """``label`` reads the ``email`` column, which the ``email`` field
        overwrites with ``name`` — the read must still see the raw column."""

        class S(serializers.ModelSerializer):
            id = serializers.UUIDField()
            email = serializers.CharField(source="name")
            label = ValuesMethodField(sources=("email",))

            def get_label(self, obj):
                return "label: {}".format(obj.email)

            class Meta:
                model = Author
                fields = ("id", "email", "label")

        viewset = make_viewset(
            serializer_class=S,
            queryset=Author.objects.filter(pk=self.alice.pk),
        )
        result = self._run(viewset)
        self.assertEqual(result[0]["email"], self.alice.name)
        self.assertEqual(result[0]["label"], "label: {}".format(self.alice.email))

    def test_method_field_source_shared_with_renamed_field(self):
        """A source read by both a rename and a method field is not promoted to
        a SQL alias: that would drop the column the method still reads."""

        class S(serializers.ModelSerializer):
            id = serializers.UUIDField()
            display_name = serializers.CharField(source="name")
            label = ValuesMethodField(sources=("name",))

            def get_label(self, obj):
                return "label: {}".format(obj.name)

            class Meta:
                model = Author
                fields = ("id", "display_name", "label")

        viewset = make_viewset(
            serializer_class=S,
            queryset=Author.objects.filter(pk=self.alice.pk),
        )
        result = self._run(viewset)
        self.assertEqual(result[0]["display_name"], "Alice")
        self.assertEqual(result[0]["label"], "label: Alice")

    def test_declared_field_named_for_the_pk_survives_projection(self):
        """A deferred fetch adds the pk column to ``values()`` for keying. When
        a declared field already carries that name, the mapped value stays."""

        class P(serializers.ModelSerializer):
            class Meta:
                model = Publisher
                fields = ("name",)

        class S(serializers.ModelSerializer):
            id = serializers.CharField(source="email")
            publisher = P(read_only=True)

            class Meta:
                model = Author
                fields = ("id", "publisher")

        viewset = make_viewset(
            serializer_class=S,
            queryset=Author.objects.filter(pk=self.alice.pk),
        )
        result = self._run(viewset)
        self.assertEqual(result[0]["id"], self.alice.email)
        self.assertEqual(result[0]["publisher"]["name"], self.alice.publisher.name)

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

    def test_method_field_source_naming_both_a_column_and_a_path(self):
        """``sources=('publisher', 'publisher.name')`` resolves ``obj.publisher``
        to the raw FK column, which cannot also carry the traversal."""

        class S(serializers.ModelSerializer):
            id = serializers.UUIDField()
            publisher_label = ValuesMethodField(sources=("publisher", "publisher.name"))

            def get_publisher_label(self, obj):
                return "pub: {}".format(obj.publisher)

            class Meta:
                model = Author
                fields = ("id", "publisher_label")

        viewset = make_viewset(
            serializer_class=S,
            queryset=Author.objects.filter(pk=self.alice.pk),
        )
        result = self._run(viewset)
        self.assertEqual(
            result[0]["publisher_label"], "pub: {}".format(self.alice.publisher_id)
        )

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

    def test_serialize_queryset_group_by_unknown_field_raises(self):
        """``group_by`` naming no output field raises, not a silent None bucket."""
        viewset = make_viewset(
            id=serializers.UUIDField(),
            books=make_nested(
                model=Book,
                many=True,
                id=serializers.IntegerField(),
                title=serializers.CharField(),
            ),
            deferred_fields=("books",),
        )
        with self.assertRaises(KeyError):
            viewset.serialize_queryset(Book.objects.all(), "books", group_by="author")

    def test_auto_defer_two_level_reverse_recursion(self):
        """Books auto-defer; inside that deferred subtree the two grandchild
        many=True fields — reviews (reverse FK) + tags (M2M) — each auto-defer
        into their own batched query instead of cartesian-joining. Budget is
        authors + books + reviews + tags = 4, not the 2-query cartesian."""
        BookWithReviewsAndTagsSer = make_serializer(
            model=Book,
            id=serializers.IntegerField(),
            title=serializers.CharField(),
            reviews=ReviewSerializer(many=True),
            tags=TagSerializer(many=True),
        )
        Ser = make_serializer(
            id=serializers.CharField(),
            books=BookWithReviewsAndTagsSer(many=True),
        )
        viewset = make_viewset(
            serializer_class=Ser,
            queryset=Author.objects.filter(pk=self.alice.pk),
        )
        with self.assertNumQueries(4):
            result = viewset.serialize(viewset.get_queryset())
        alice = result[0]
        books_by_id = {b["id"]: b for b in alice["books"]}
        # book_a1: 2 reviews, 2 tags
        self.assertEqual(
            sorted(r["rating"] for r in books_by_id[self.book_a1.pk]["reviews"]),
            [4, 5],
        )
        self.assertEqual(
            sorted(t["name"] for t in books_by_id[self.book_a1.pk]["tags"]),
            ["classic", "fiction"],
        )
        # book_a2: 1 review, 1 tag
        self.assertEqual(
            [r["rating"] for r in books_by_id[self.book_a2.pk]["reviews"]],
            [3],
        )
        self.assertEqual(
            [t["name"] for t in books_by_id[self.book_a2.pk]["tags"]],
            ["fiction"],
        )
        # book_a3: no reviews, no tags
        self.assertEqual(books_by_id[self.book_a3.pk]["reviews"], [])
        self.assertEqual(books_by_id[self.book_a3.pk]["tags"], [])

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
        ``serialize_queryset``. The per-call ``_MethodContext`` carrier
        threads down to the nested ``map_row``, so the method sees this
        request's context dict.
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

    def test_method_field_reads_per_request_context_without_leak(self):
        """A top-level ``ValuesMethodField`` must not cache request context
        between calls on the shared (class-attribute) engine."""

        class S(serializers.ModelSerializer):
            id = serializers.UUIDField()
            tagged = ValuesMethodField(sources=("name",))

            def get_tagged(self, obj):
                return "{}/{}".format(obj.name, self.context["request"].tag)

            class Meta:
                model = Author
                fields = ("id", "tagged")

        viewset = make_viewset(
            serializer_class=S,
            queryset=Author.objects.filter(pk=self.alice.pk),
        )

        viewset.request = MagicMock(tag="req1")
        first = viewset.serialize(viewset.get_queryset())
        viewset.request = MagicMock(tag="req2")
        second = viewset.serialize(viewset.get_queryset())

        self.assertEqual(first[0]["tagged"], "Alice/req1")
        self.assertEqual(second[0]["tagged"], "Alice/req2")

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
    def test_validate_raises_on_drift_in_flat_output(self):
        """consolidate() adding a field not on the serializer raises."""
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
    def test_serialize_object_does_not_mask_drift_as_404(self):
        """Drift in a retrieve path propagates, not swallowed into Http404 by
        the lookup-error handler."""
        author = Author.objects.create(name="A", email="a@example.com")
        Ser = make_serializer(id=serializers.CharField(), name=serializers.CharField())

        class V(BaseValuesViewset):
            queryset = Author.objects.all()
            serializer_class = Ser

            def consolidate(self, items, queryset):
                for item in items:
                    item["unexpected"] = "oops"
                return items

        with self.assertRaises(OutputValidationError):
            V().serialize_object(pk=author.pk)

    @override_settings(DEBUG=True)
    def test_validate_raises_on_drift_in_nested_many_output(self):
        """consolidate() producing a nested many item missing a field raises."""
        Ser = make_serializer(
            id=serializers.CharField(), books=BookSerializer(many=True)
        )

        class V(BaseValuesViewset, ListModelMixin):
            queryset = Author.objects.none()
            serializer_class = Ser
            deferred_fields = ("books",)

            def consolidate(self, items, queryset):
                for item in items:
                    item["books"] = [{"id": "b1"}]  # missing 'title'
                return items

        _assert_serialize_raises(self, V(), [{"id": "a1"}], "title")

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
            self, V(), [{"id": "b1", "author": str(uuid.uuid4())}], "name"
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
    def test_validate_catches_consolidate_omitting_read_only_deferred_field(self):
        """A ``read_only`` nested field is ``required=False`` in DRF, but
        ``consolidate()`` owns filling it — omitting it is drift, not an
        optional key.
        """
        Ser = make_serializer(
            id=serializers.CharField(),
            books=BookSerializer(many=True, read_only=True),
        )

        class V(BaseValuesViewset, ListModelMixin):
            queryset = Author.objects.none()
            serializer_class = Ser
            deferred_fields = ("books",)

            def consolidate(self, items, queryset):
                return items  # never populates "books"

        _assert_serialize_raises(self, V(), [{"id": "a1"}], "books")

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
    def test_validate_allows_absent_optional_nested_fields(self):
        """A nested plain ``Serializer`` over a JSON column may declare
        ``required=False`` fields. DRF omits them from output (SkipField) when
        the stored data lacks them, so the validator must not flag them missing.
        """

        class SectionSerializer(serializers.Serializer):
            learners_see_fixed_order = serializers.BooleanField(default=False)
            section_title = serializers.CharField(required=False)
            description = serializers.CharField(required=False)

        a1 = Author.objects.create(
            name="A1",
            email="a1@example.com",
            metadata=[{"learners_see_fixed_order": True}],
        )
        viewset = make_viewset(
            queryset=Author.objects.filter(pk=a1.pk),
            id=serializers.UUIDField(),
            metadata=SectionSerializer(many=True),
        )
        result = viewset.serialize(viewset.get_queryset())
        self.assertEqual(result[0]["metadata"], [{"learners_see_fixed_order": True}])

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
        a1 = Author.objects.create(name="A1", email="a1@example.com")
        Book.objects.create(author=a1, title="B1")
        Author.objects.create(name="A2", email="a2@example.com")
        viewset = make_viewset(
            queryset=Author.objects.order_by("name"),
            id=serializers.UUIDField(),
            book_titles=serializers.CharField(source="books.title"),
        )
        result = viewset.serialize(viewset.get_queryset())
        self.assertEqual(result[0]["book_titles"], ["B1"])
        self.assertEqual(result[1]["book_titles"], [])

    @override_settings(DEBUG=True)
    def test_shared_forward_target_rejects_in_place_mutation(self):
        """Parents share one dict per forward target, so mutating it is refused."""
        publisher = Publisher.objects.create(name="Shared")
        for i in range(2):
            Author.objects.create(
                name="A{}".format(i), email="a{}@e.com".format(i), publisher=publisher
            )
        viewset = make_viewset(
            queryset=Author.objects.order_by("name"),
            id=serializers.UUIDField(),
            publisher=PublisherSerializer(),
        )

        items = viewset.serialize(viewset.get_queryset())

        self.assertIs(items[0]["publisher"], items[1]["publisher"])
        with self.assertRaises(TypeError):
            items[0]["publisher"]["name"] = "Mutated"
        # Replacing the field, rather than mutating it, stays allowed.
        items[0]["publisher"] = dict(items[0]["publisher"], name="Mutated")
        self.assertEqual(items[1]["publisher"]["name"], "Shared")

    @override_settings(DEBUG=False)
    def test_fetched_children_are_plain_dicts_when_debug_false(self):
        """The guard is a dev aid — production pays nothing for it."""
        publisher = Publisher.objects.create(name="Shared")
        Author.objects.create(name="A", email="a@e.com", publisher=publisher)
        viewset = make_viewset(
            queryset=Author.objects.all(),
            id=serializers.UUIDField(),
            publisher=PublisherSerializer(),
        )

        items = viewset.serialize(viewset.get_queryset())

        items[0]["publisher"]["name"] = "Mutated"
        self.assertEqual(items[0]["publisher"]["name"], "Mutated")

    @override_settings(DEBUG=True)
    def test_deferred_fields_are_not_frozen(self):
        """consolidate() owns what it builds, so those nested dicts stay mutable."""
        Author.objects.create(name="A", email="a@e.com")
        Ser = make_serializer(
            id=serializers.CharField(), books=BookSerializer(many=True)
        )

        class V(BaseValuesViewset, ListModelMixin):
            queryset = Author.objects.all()
            serializer_class = Ser
            deferred_fields = ("books",)

            def consolidate(self, items, queryset):
                for item in items:
                    item["books"] = [{"id": "b1", "title": "B1"}]
                return items

        items = V().serialize(V.queryset)

        items[0]["books"][0]["title"] = "Renamed"
        self.assertEqual(items[0]["books"][0]["title"], "Renamed")

    def test_missing_source_key_raises_key_error(self):
        """A declared ``source`` missing from the fetched row raises KeyError.

        The failure surfaces on the first request rather than propagating as a
        silent ``None`` — the shape a forgotten ``annotate_queryset`` column
        would otherwise produce.
        """
        viewset = make_viewset(
            queryset=Author.objects.none(),
            id=serializers.CharField(),
            # Target shadows a model field, so the rename stays in Python rather
            # than being promoted to an SQL alias the row would then carry.
            name=serializers.CharField(source="email"),
        )

        with self.assertRaises(KeyError):
            _serialize(viewset, [{"id": "a1"}])


class TestAuxiliaryAPIs(TestCase):
    """Surfaces beyond ``serialize()``: separate-queryset serialization
    (``serialize_queryset``), deferred-field filtering, and lazy queryset
    resolution when no class-level ``queryset`` is defined.
    """

    def test_serialize_queryset_returns_list_of_items(self):
        """serialize_queryset without group_by returns a flat list."""
        viewset = author_books_viewset(deferred=True)
        qs = create_mock_queryset(
            [{"id": "b1", "title": "B1"}, {"id": "b2", "title": "B2"}], model=Book
        )
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

    def test_scalar_fetch_resolves_pk_without_class_level_queryset(self):
        """A scalar cross-many fetch resolves the parent PK lazily via
        get_queryset() when no class-level queryset is defined."""
        author = Author.objects.create(name="A", email="a@example.com")
        Book.objects.create(author=author, title="B1")
        Book.objects.create(author=author, title="B2")
        Ser = make_serializer(
            id=serializers.CharField(),
            book_titles=serializers.CharField(source="books.title"),
        )

        class V(BaseValuesViewset, ListModelMixin):
            serializer_class = Ser

            def get_queryset(self):
                return Author.objects.all()

        result = V().serialize(V().get_queryset())
        self.assertEqual(sorted(result[0]["book_titles"]), ["B1", "B2"])

    def test_serialize_queryset_raises_on_unknown_path(self):
        """serialize_queryset on a path no serializer level declares raises
        ValueError, rather than silently serializing under the top level."""
        viewset = author_books_viewset(deferred=True)

        with self.assertRaises(ValueError):
            viewset.serialize_queryset(Author.objects.none(), "somepath")
