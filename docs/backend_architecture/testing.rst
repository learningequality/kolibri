Backend Testing
===============

Backend testing is carried out using `pytest <https://docs.pytest.org/>`__ and Django's test framework. **We strongly encourage comprehensive testing** of all backend code.

.. note::
  For general testing principles including Test-Driven Development (TDD), see :ref:`tdd`.

What Should Be Tested
----------------------

**Nearly all Python code changes are amenable to testing.** You should write tests for:

- API endpoints and serializers
- Models and database queries
- Business logic and utility functions
- Permission and authentication logic
- Data validation and transformations
- Background tasks and async operations

Test Organization
-----------------

File structure
~~~~~~~~~~~~~~

Tests are organized in ``test/`` directories within each module:

.. code-block:: text

  kolibri/core/auth/
  ├── models.py
  ├── api.py
  ├── permissions.py
  └── test/
      ├── __init__.py
      ├── helpers.py           # Test helper functions
      ├── test_models.py       # Tests for models.py
      ├── test_api.py          # Tests for API endpoints
      └── test_permissions.py  # Tests for permissions

Naming conventions
~~~~~~~~~~~~~~~~~~

- Test directories: ``test/``
- Test files: ``test_*.py`` (e.g., ``test_models.py``, ``test_api.py``)
- Test classes: ``*TestCase`` or ``Test*``
- Test methods: ``test_*``

Running Tests
-------------

Run all backend tests:

.. code-block:: bash

  pytest

Run specific test file:

.. code-block:: bash

  pytest kolibri/core/auth/test/test_permissions.py

Run specific test with filter:

.. code-block:: bash

  pytest kolibri/core/auth/test/test_permissions.py -k test_admin_can_delete_membership

Run tests for a specific class:

.. code-block:: bash

  pytest kolibri/core/auth/test/test_permissions.py -k MembershipPermissionsTestCase

For more advanced usage, see :ref:`automated testing`.

Test Patterns and Examples
---------------------------

Django vs. Pure Python Tests
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Kolibri contains both Django application code and generic Python code, which require different testing approaches:

**Django application code** (models, views, API endpoints):
- Use ``django.test.TestCase`` or ``rest_framework.test.APITestCase``
- Has access to Django ORM, database transactions
- Use ``setUpTestData`` for test data
- Can test database queries, model methods, API endpoints

**Generic Python code** (utility functions, parsers, algorithms):
- Use plain ``pytest`` functions or ``unittest.TestCase``
- No Django dependencies
- Faster to run (no database setup)
- Test pure logic, data transformations, calculations

Using Django TestCase
~~~~~~~~~~~~~~~~~~~~~

For Django application code (models, views, permissions):

.. code-block:: python

  from django.test import TestCase
  from ..models import Facility, FacilityUser
  from .helpers import create_dummy_facility_data

  class FacilityTestCase(TestCase):
      """Tests for Facility model"""

      @classmethod
      def setUpTestData(cls):
          """Set up data for the whole TestCase"""
          cls.facility = Facility.objects.create(name="Test Facility")
          cls.user = FacilityUser.objects.create(
              username="testuser",
              facility=cls.facility
          )

      def test_facility_has_name(self):
          """Test that facility has a name"""
          self.assertEqual(self.facility.name, "Test Facility")

      def test_user_belongs_to_facility(self):
          """Test that user belongs to facility"""
          self.assertEqual(self.user.facility, self.facility)

Testing pure Python code
~~~~~~~~~~~~~~~~~~~~~~~~

For generic Python utilities with no Django dependencies:

.. code-block:: python

  import pytest
  from ..utils import calculate_completion_percentage, parse_duration

  def test_calculate_completion_percentage():
      """Test completion percentage calculation"""
      assert calculate_completion_percentage(50, 100) == 50.0
      assert calculate_completion_percentage(0, 100) == 0.0
      assert calculate_completion_percentage(100, 100) == 100.0

  def test_calculate_completion_with_zero_total():
      """Test that zero total raises ValueError"""
      with pytest.raises(ValueError):
          calculate_completion_percentage(50, 0)

  def test_parse_duration_formats():
      """Test parsing various duration formats"""
      assert parse_duration("1:30") == 90
      assert parse_duration("0:05") == 5
      assert parse_duration("2:00:00") == 7200

Or using unittest.TestCase for pure Python:

.. code-block:: python

  import unittest
  from ..utils import format_file_size

  class FileSizeFormatterTestCase(unittest.TestCase):
      """Tests for file size formatting utility"""

      def test_bytes_format(self):
          """Test formatting bytes"""
          self.assertEqual(format_file_size(500), "500 B")

      def test_kilobytes_format(self):
          """Test formatting kilobytes"""
          self.assertEqual(format_file_size(1024), "1.0 KB")

      def test_megabytes_format(self):
          """Test formatting megabytes"""
          self.assertEqual(format_file_size(1048576), "1.0 MB")

Using helper functions
~~~~~~~~~~~~~~~~~~~~~~

Create reusable helper functions in ``helpers.py`` for Django tests:

.. code-block:: python

  # test/helpers.py
  from ..models import Facility, FacilityUser

  DUMMY_PASSWORD = "password"

  def create_test_facility(name="Test"):
      """Create a test facility"""
      return Facility.objects.create(name=name)

  def create_test_user(facility, username="testuser"):
      """Create a test user in a facility"""
      user = FacilityUser.objects.create(
          username=username,
          facility=facility
      )
      user.set_password(DUMMY_PASSWORD)
      user.save()
      return user

Then use them in tests:

.. code-block:: python

  from .helpers import create_test_facility, create_test_user

  class UserTestCase(TestCase):
      def setUp(self):
          self.facility = create_test_facility()
          self.user = create_test_user(self.facility)

Testing API endpoints
~~~~~~~~~~~~~~~~~~~~~

Use Django's ``reverse()`` function to generate URLs to avoid brittleness:

.. code-block:: python

  from django.urls import reverse
  from rest_framework.test import APITestCase
  from rest_framework import status
  from .helpers import create_test_user, create_test_facility

  class FacilityAPITestCase(APITestCase):
      @classmethod
      def setUpTestData(cls):
          cls.facility = create_test_facility()
          cls.user = create_test_user(cls.facility)

      def test_can_list_facilities(self):
          """Test that authenticated user can list facilities"""
          self.client.force_authenticate(user=self.user)
          url = reverse('kolibri:core:facility-list')
          response = self.client.get(url)
          self.assertEqual(response.status_code, status.HTTP_200_OK)
          self.assertEqual(len(response.data), 1)

      def test_unauthenticated_cannot_create_facility(self):
          """Test that unauthenticated user cannot create facility"""
          url = reverse('kolibri:core:facility-list')
          response = self.client.post(url, {'name': 'New'})
          self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

      def test_can_retrieve_specific_facility(self):
          """Test retrieving a specific facility by ID"""
          self.client.force_authenticate(user=self.user)
          url = reverse('kolibri:core:facility-detail', kwargs={'pk': self.facility.id})
          response = self.client.get(url)
          self.assertEqual(response.status_code, status.HTTP_200_OK)
          self.assertEqual(response.data['id'], str(self.facility.id))

Testing permissions
~~~~~~~~~~~~~~~~~~~

.. code-block:: python

  from django.test import TestCase
  from .helpers import create_dummy_facility_data

  class PermissionsTestCase(TestCase):
      @classmethod
      def setUpTestData(cls):
          cls.data = create_dummy_facility_data()
          cls.admin = cls.data["facility_admin"]
          cls.learner = cls.data["learners"][0]

      def test_admin_can_create_classroom(self):
          """Test that facility admin can create classroom"""
          self.assertTrue(
              self.admin.can_create(
                  Classroom,
                  {"parent": self.data["facility"]}
              )
          )

      def test_learner_cannot_create_classroom(self):
          """Test that learner cannot create classroom"""
          self.assertFalse(
              self.learner.can_create(
                  Classroom,
                  {"parent": self.data["facility"]}
              )
          )

Testing ValuesViewset APIs
~~~~~~~~~~~~~~~~~~~~~~~~~~~

``ValuesViewset`` is a performance-optimized API pattern used in Kolibri. For complete documentation on the ValuesViewset pattern, see :doc:`api_patterns`.

Test ValuesViewset endpoints the same way as standard DRF endpoints:

.. code-block:: python

  from django.urls import reverse
  from rest_framework import status
  from rest_framework.test import APITestCase

  from ..models import Classroom, Lesson
  from .helpers import create_test_facility, create_test_user


  class LessonAPITestCase(APITestCase):
      @classmethod
      def setUpTestData(cls):
          cls.facility = create_test_facility()
          cls.admin = create_test_user(cls.facility, role="admin")
          cls.classroom = Classroom.objects.create(
              name="Math Class",
              parent=cls.facility
          )
          cls.lesson = Lesson.objects.create(
              title="Lesson 1",
              description="Introduction to Math",
              collection=cls.classroom,
              created_by=cls.admin,
              is_active=True
          )

      def test_list_lessons_returns_correct_fields(self):
          """Test that lesson list returns expected fields"""
          self.client.force_authenticate(user=self.admin)
          url = reverse('kolibri:core:lesson-list')
          response = self.client.get(url)

          self.assertEqual(response.status_code, status.HTTP_200_OK)
          self.assertEqual(len(response.data), 1)

          lesson_data = response.data[0]
          # Verify field_map transformations
          self.assertIn('active', lesson_data)  # Mapped from is_active
          self.assertEqual(lesson_data['active'], True)
          self.assertEqual(lesson_data['title'], 'Lesson 1')

      def test_retrieve_lesson_includes_related_data(self):
          """Test that retrieving lesson includes classroom data"""
          self.client.force_authenticate(user=self.admin)
          url = reverse('kolibri:core:lesson-detail', kwargs={'pk': self.lesson.id})
          response = self.client.get(url)

          self.assertEqual(response.status_code, status.HTTP_200_OK)
          # Verify FK lookups are included
          self.assertIn('classroom', response.data)
          self.assertEqual(response.data['classroom']['name'], 'Math Class')

**Performance testing:**

Use Django Silk to profile your ValuesViewset endpoints and verify query performance. This helps ensure you're not creating N+1 queries and that your implementation is actually performant. Run Kolibri with Silk enabled, make requests to your endpoint, and review the query counts and execution times in the Silk interface.

Using pytest fixtures
~~~~~~~~~~~~~~~~~~~~~

For pytest-style tests, use fixtures:

.. code-block:: python

  import pytest
  from kolibri.core.auth.test.helpers import provision_device

  @pytest.fixture
  def facility_data():
      """Provide facility data for tests"""
      return provision_device()

  def test_something(facility_data):
      """Test using fixture"""
      assert facility_data["facility"] is not None

Best Practices
--------------

1. **Write tests for all new code**: Nearly all Python code is testable
2. **Use descriptive test names**: Test name should describe what it tests
3. **One assertion per test** (when practical): Makes failures easier to diagnose
4. **Use setUpTestData for expensive setup**: Runs once per TestCase
5. **Use setUp for test-specific setup**: Runs before each test method
6. **Use helper functions**: Keep tests DRY with reusable helpers
7. **Test edge cases**: Empty lists, None values, invalid input, etc.
8. **Test permissions thoroughly**: Auth/permissions are critical
9. **Keep tests fast**: Use in-memory databases, mock expensive operations

Common Patterns
---------------

Testing model methods
~~~~~~~~~~~~~~~~~~~~~

.. code-block:: python

  def test_user_full_name_returns_username_if_no_full_name(self):
      """Test that full_name falls back to username"""
      user = FacilityUser.objects.create(
          username="testuser",
          facility=self.facility
      )
      self.assertEqual(user.full_name, "testuser")

Testing validators
~~~~~~~~~~~~~~~~~~

.. code-block:: python

  from django.core.exceptions import ValidationError

  def test_invalid_email_raises_validation_error(self):
      """Test that invalid email raises error"""
      with self.assertRaises(ValidationError):
          user = FacilityUser(
              username="test",
              email="invalid-email",
              facility=self.facility
          )
          user.full_clean()

Mocking external dependencies
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: python

  from unittest.mock import patch, MagicMock

  @patch('requests.get')
  def test_external_api_call(self, mock_get):
      """Test function that calls external API"""
      mock_response = MagicMock()
      mock_response.json.return_value = {'key': 'value'}
      mock_get.return_value = mock_response

      result = fetch_external_data()
      self.assertEqual(result['key'], 'value')

References
----------

- `pytest documentation <https://docs.pytest.org/>`__
- `Django testing documentation <https://docs.djangoproject.com/en/stable/topics/testing/>`__
- `Django REST Framework testing <https://www.django-rest-framework.org/api-guide/testing/>`__
