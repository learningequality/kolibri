from django.test import TestCase
from django.utils import timezone

from kolibri.core.errorreports.models import ErrorReports


class ErrorReportsTestCase(TestCase):
    databases = "__all__"  # I am not sure about this, maybe a overkill but works

    def test_insert_or_update_error(self):
        error_from = ErrorReports.FRONTEND
        error_message = "Test Error"
        traceback = "Test Traceback"

        error = ErrorReports.insert_or_update_error(
            error_from, error_message, traceback
        )
        self.assertEqual(error.error_from, error_from)
        self.assertEqual(error.error_message, error_message)
        self.assertEqual(error.traceback, traceback)
        self.assertEqual(error.no_of_errors, 1)
        self.assertFalse(error.sent)
        self.assertLess(
            timezone.now() - error.first_occurred, timezone.timedelta(seconds=1)
        )
        self.assertLess(
            timezone.now() - error.last_occurred, timezone.timedelta(seconds=1)
        )

        # creating the error again, so this time it should update the error
        error = ErrorReports.insert_or_update_error(
            error_from, error_message, traceback
        )
        self.assertEqual(error.error_from, error_from)
        self.assertEqual(error.error_message, error_message)
        self.assertEqual(error.traceback, traceback)
        self.assertEqual(error.no_of_errors, 2)
        self.assertFalse(error.sent)
        self.assertLess(
            timezone.now() - error.first_occurred, timezone.timedelta(seconds=1)
        )
        self.assertLess(
            timezone.now() - error.last_occurred, timezone.timedelta(seconds=1)
        )

    def test_get_unsent_errors(self):
        ErrorReports.objects.create(
            error_from=ErrorReports.FRONTEND,
            error_message="Error 1",
            traceback="Traceback 1",
            sent=False,
        )
        ErrorReports.objects.create(
            error_from=ErrorReports.BACKEND,
            error_message="Error 2",
            traceback="Traceback 2",
            sent=False,
        )
        ErrorReports.objects.create(
            error_from=ErrorReports.BACKEND,
            error_message="Error 3",
            traceback="Traceback 3",
            sent=True,
        )

        # Get unsent errors, shall be only 2 as out of 3, 1 is sent
        unsent_errors = ErrorReports.get_unsent_errors()
        self.assertEqual(unsent_errors.count(), 2)
        self.assertFalse(unsent_errors[0].sent)
        self.assertFalse(unsent_errors[1].sent)

    def test_mark_as_sent(self):
        error = ErrorReports.objects.create(
            error_from=ErrorReports.FRONTEND,
            error_message="Test Error",
            traceback="Test Traceback",
            sent=False,
        )
        # first check error is unsent, then set True and assert again
        self.assertFalse(error.sent)
        error.mark_as_sent()
        self.assertTrue(error.sent)
