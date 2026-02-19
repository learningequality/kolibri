Testing
=======

Kolibri uses comprehensive testing for both frontend and backend code. This page covers general testing principles. For specific testing guides, see:

- :doc:`frontend_architecture/unit_testing` - Frontend testing with Jest
- :doc:`backend_architecture/testing` - Backend testing with pytest

.. _tdd:

Test-Driven Development (TDD)
------------------------------

We encourage using Test-Driven Development (TDD) and the **Red/Green/Refactor** cycle:

1. **Red**: Write a failing test first that describes the desired behavior
2. **Green**: Write the minimum code to make the test pass
3. **Refactor**: Clean up the code while keeping tests passing

This approach is particularly valuable for:

- **Bug fixes**: Write a test that reproduces the bug (fails), then fix it (passes)
- **Incremental feature building**: Add one test at a time for each piece of functionality
- **API changes**: Test the interface before implementation

**When to use TDD:**

- Fixing bugs: Always write a failing test first to confirm the bug, then fix it
- New features: Build incrementally by writing tests for each component of the feature
- Refactoring: Ensure existing tests pass before and after refactoring

TDD Example: Bug Fix
~~~~~~~~~~~~~~~~~~~~~

**Step 1 - Red**: Write a failing test that demonstrates the bug

.. code-block:: python

  def test_user_can_update_own_profile(self):
      """Test that user can update their own full name"""
      self.client.force_authenticate(user=self.user)
      url = reverse('kolibri:core:facilityuser-detail', kwargs={'pk': self.user.id})
      response = self.client.patch(url, {'full_name': 'New Name'})
      self.assertEqual(response.status_code, status.HTTP_200_OK)
      self.user.refresh_from_db()
      self.assertEqual(self.user.full_name, 'New Name')

Run the test - it should fail, confirming the bug exists.

**Step 2 - Green**: Fix the code to make the test pass

.. code-block:: python

  # In api.py
  class UserViewSet(viewsets.ModelViewSet):
      def get_permissions(self):
          if self.action == 'partial_update':
              # Allow users to update their own profile
              return [IsAuthenticated()]
          return super().get_permissions()

Run the test again - it should now pass.

.. note::
  This is a simplified example. Kolibri uses its own permission system (``KolibriAuthPermissions`` from ``kolibri.core.auth.api``) rather than standard DRF permission classes. See ``docs/backend_architecture/api_patterns.rst`` for correct patterns.

**Step 3 - Refactor**: Clean up if needed while keeping tests passing

Review the fix and ensure it's clean and maintainable. Run all tests to ensure nothing else broke.

Why TDD Works
~~~~~~~~~~~~~

- **Confidence**: Tests prove your code works and prevent regressions
- **Design**: Writing tests first leads to better API design
- **Documentation**: Tests document how code should behave
- **Debugging**: Failing tests pinpoint exactly what's broken
- **Refactoring**: Tests give you confidence to improve code structure

Best Practices
~~~~~~~~~~~~~~

1. **Write tests for all new code**: Both frontend and backend code should be tested
2. **Use descriptive test names**: Test name should describe what it tests
3. **One assertion per test** (when practical): Makes failures easier to diagnose
4. **Test edge cases**: Empty lists, None values, invalid input, etc.
5. **Keep tests fast**: Use mocks for expensive operations
6. **Keep tests isolated**: Each test should be independent
7. **Don't weaken existing tests**: Do not modify or delete existing tests unless the behavior they test has been intentionally changed. If new code breaks existing tests, fix the code, not the tests. Never loosen assertions, add workarounds, or reduce coverage to make a failing test pass.
