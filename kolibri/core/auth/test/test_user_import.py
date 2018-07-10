from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import tempfile

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from ..management.commands.importusers import create_user
from ..management.commands.importusers import infer_and_create_class
from ..management.commands.importusers import infer_facility
from ..management.commands.importusers import validate_username
from ..models import Classroom
from ..models import FacilityUser
from .helpers import setup_device


class UserImportTestCase(TestCase):
    """
    Tests for functions used in userimport command.
    """

    def setUp(self):
        self.facility, self.superuser = setup_device()

    def test_validate_username_no_username(self):
        with self.assertRaises(CommandError):
            validate_username({})

    def test_validate_username_none_username(self):
        with self.assertRaises(CommandError):
            validate_username({'username': None})

    def test_infer_facility_not_specified(self):
        default = {}
        user = {}
        self.assertEqual(infer_facility(user, default), default)

    def test_infer_facility_none(self):
        default = {}
        user = {'facility': None}
        self.assertEqual(infer_facility(user, default), default)

    def test_infer_facility_by_id(self):
        default = {}
        user = {'facility': self.facility.id}
        self.assertEqual(infer_facility(user, default), self.facility)

    def test_infer_facility_by_name(self):
        default = {}
        user = {'facility': self.facility.name}
        self.assertEqual(infer_facility(user, default), self.facility)

    def test_infer_facility_fail(self):
        default = {}
        user = {'facility': 'garbage'}
        with self.assertRaises(CommandError):
            infer_facility(user, default)

    def test_infer_class_no_class_no_effect(self):
        user = {}
        infer_and_create_class(user, self.facility)
        self.assertEqual(Classroom.objects.count(), 0)

    def test_infer_class_falsy_class_no_effect(self):
        user = {'class': ''}
        infer_and_create_class(user, self.facility)
        self.assertEqual(Classroom.objects.count(), 0)

    def test_infer_class_by_id(self):
        classroom = Classroom.objects.create(name='testclass', parent=self.facility)
        user = {'class': classroom.id}
        self.assertEqual(infer_and_create_class(user, self.facility), classroom)

    def test_infer_class_by_name(self):
        classroom = Classroom.objects.create(name='testclass', parent=self.facility)
        user = {'class': classroom.name}
        self.assertEqual(infer_and_create_class(user, self.facility), classroom)

    def test_infer_class_create(self):
        user = {'class': 'testclass'}
        self.assertEqual(infer_and_create_class(user, self.facility), Classroom.objects.get(name='testclass'))

    def test_create_user_test_header_row(self):
        user = {
            'class': 'class',
            'facility': 'facility',
            'username': 'username',
        }
        self.assertFalse(create_user(0, user))

    def test_create_user_exists(self):
        user = {
            'username': self.superuser.username,
        }
        self.assertFalse(create_user(1, user, default_facility=self.facility))

    def test_create_user_exists_add_classroom(self):
        user = {
            'username': self.superuser.username,
            'class': 'testclass',
        }
        create_user(1, user, default_facility=self.facility)
        self.assertTrue(self.superuser.is_member_of(Classroom.objects.get(name='testclass')))

    def test_create_user_not_exist(self):
        user = {
            'username': 'testuser',
        }
        self.assertTrue(create_user(1, user, default_facility=self.facility))

    def test_create_user_not_exist_add_classroom(self):
        user = {
            'username': 'testuser',
            'class': 'testclass',
        }
        create_user(1, user, default_facility=self.facility)
        self.assertTrue(FacilityUser.objects.get(username='testuser').is_member_of(Classroom.objects.get(name='testclass')))

    def test_create_user_not_exist_bad_username(self):
        user = {
            'username': 'test$user',
        }
        self.assertFalse(create_user(1, user, default_facility=self.facility))


class UserImportCommandTestCase(TestCase):
    """
    Tests for userimport command.
    """

    def setUp(self):
        self.csvfile, self.csvpath = tempfile.mkstemp(suffix='csv')

    def test_device_not_setup(self):
        with self.assertRaisesRegexp(CommandError, 'No default facility exists'):
            call_command('importusers', self.csvpath)

    def test_setup_headers_no_username(self):
        setup_device()
        with open(self.csvpath, 'w') as f:
            f.write('class,facility')
        with self.assertRaisesRegexp(CommandError, 'No usernames specified'):
            call_command('importusers', self.csvpath)

    def test_setup_headers_invalid_header(self):
        setup_device()
        with open(self.csvpath, 'w') as f:
            f.write('class,username,dogfood')
        with self.assertRaisesRegexp(CommandError, 'Mix of valid and invalid header'):
            call_command('importusers', self.csvpath)

    def test_setup_headers_make_user(self):
        setup_device()
        with open(self.csvpath, 'w') as f:
            f.write('username\n')
            f.write('testuser')
        call_command('importusers', self.csvpath)
        self.assertTrue(FacilityUser.objects.filter(username='testuser').exists())

    def test_setup_no_headers_make_user(self):
        setup_device()
        with open(self.csvpath, 'w') as f:
            f.write('Test User,testuser')
        call_command('importusers', self.csvpath)
        self.assertTrue(FacilityUser.objects.filter(username='testuser').exists())

    def test_setup_no_headers_bad_user_good_user(self):
        setup_device()
        with open(self.csvpath, 'w') as f:
            f.write('Test User,testuser\nOther User,te$tuser')
        call_command('importusers', self.csvpath)
        self.assertTrue(FacilityUser.objects.filter(username='testuser').exists())
        self.assertFalse(FacilityUser.objects.filter(username='te$tuser').exists())
