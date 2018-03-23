# -*- coding: utf-8 -*-
"""
Django settings for kolibri project.

For more information on this file, see
https://docs.djangoproject.com/en/1.9/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/1.9/ref/settings/
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import json
import os

import pytz
from tzlocal import get_localzone

import kolibri
from kolibri.utils import conf
from kolibri.utils import i18n

from django.conf import locale

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
# import kolibri, so we can get the path to the module.
# we load other utilities related to i18n
# This is essential! We load the kolibri conf INSIDE the Django conf

KOLIBRI_MODULE_PATH = os.path.dirname(kolibri.__file__)

BASE_DIR = os.path.abspath(os.path.dirname(__name__))

KOLIBRI_HOME = conf.KOLIBRI_HOME

LOCALE_PATHS = [
    os.path.join(KOLIBRI_MODULE_PATH, "locale"),
]

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/1.9/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'f@ey3)y^03r9^@mou97apom*+c1m#b1!cwbm50^s4yk72xce27'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False

ALLOWED_HOSTS = ['*']

# Application definition

INSTALLED_APPS = [
    'kolibri.core',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django_filters',
    'kolibri.auth.apps.KolibriAuthConfig',
    'kolibri.content',
    'kolibri.logger',
    'kolibri.tasks.apps.KolibriTasksConfig',
    'kolibri.core.deviceadmin',
    'kolibri.core.webpack',
    'kolibri.core.exams',
    'kolibri.core.device',
    'kolibri.core.discovery',
    'kolibri.core.lessons',
    'kolibri.core.analytics',
    'rest_framework',
    'django_js_reverse',
    'jsonfield',
    'morango',
] + conf.config['INSTALLED_APPS']

# Add in the external plugins' locale paths. Our frontend messages depends
# specifically on the value of LOCALE_PATHS to find its catalog files.
LOCALE_PATHS += [
    i18n.get_installed_app_locale_path(app) for app in INSTALLED_APPS
    if i18n.is_external_plugin(app) and i18n.get_installed_app_locale_path(app)
]

MIDDLEWARE = [
    'django.contrib.sessions.middleware.SessionMiddleware',
    'kolibri.core.device.middleware.KolibriLocaleMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'kolibri.plugins.setup_wizard.middleware.SetupWizardMiddleware',
    'kolibri.auth.middleware.CustomAuthenticationMiddleware',
    'django.contrib.auth.middleware.SessionAuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'django.middleware.security.SecurityMiddleware',
]

QUEUE_JOB_STORAGE_PATH = os.path.join(KOLIBRI_HOME, "job_storage.sqlite3")

ROOT_URLCONF = 'kolibri.deployment.default.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'kolibri.core.context_processors.custom_context_processor.return_session',
                'kolibri.core.context_processors.custom_context_processor.supported_browser',
            ],
        },
    },
]

WSGI_APPLICATION = 'kolibri.deployment.default.wsgi.application'


# Database
# https://docs.djangoproject.com/en/1.9/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(KOLIBRI_HOME, 'db.sqlite3'),
        'OPTIONS': {
            'timeout': 100,
        }
    },
}

# Content directories and URLs for channel metadata and content files

# Directory and URL for storing content databases for channel data
CONTENT_DATABASE_DIR = os.path.join(KOLIBRI_HOME, 'content', 'databases')
if not os.path.exists(CONTENT_DATABASE_DIR):
    os.makedirs(CONTENT_DATABASE_DIR)

# Directory and URL for storing de-duped content files for all channels
CONTENT_STORAGE_DIR = os.path.join(KOLIBRI_HOME, 'content', 'storage')
if not os.path.exists(CONTENT_STORAGE_DIR):
    os.makedirs(CONTENT_STORAGE_DIR)

# Base default URL for downloading content from an online server
CENTRAL_CONTENT_DOWNLOAD_BASE_URL = os.environ.get('CENTRAL_CONTENT_DOWNLOAD_BASE_URL',
                                                   'http://studio.learningequality.org')

# Internationalization
# https://docs.djangoproject.com/en/1.9/topics/i18n/

# For language names, see:
# https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
# http://helpsharepointvision.nevron.com/Culture_Table.html

with open(os.path.join(KOLIBRI_MODULE_PATH, "locale", "supported_languages.json")) as f:
    LANGUAGES = i18n.parse_supported_languages(json.load(f))

# Haitian Creole is not supported out-of-the-box by Django
# Here, we use the language code in Intl.js
EXTRA_LANG_INFO = {
    'fr-ht': {
        'bidi': False,
        'code': 'fr-ht',
        'name': 'Haitian Creole',
        'name_local': 'Kreyòl ayisyen',
    },
}
locale.LANG_INFO.update(EXTRA_LANG_INFO)

LANGUAGE_CODE = conf.config.get("LANGUAGE_CODE") or "en"

try:
    TIME_ZONE = get_localzone().zone
except pytz.UnknownTimeZoneError:
    # Do not fail at this point because a timezone was not
    # detected.
    TIME_ZONE = pytz.utc.zone

# Fixes https://github.com/regebro/tzlocal/issues/44
# tzlocal 1.4 returns 'local' if unable to detect the timezone,
# and this TZ id is invalid
if TIME_ZONE == "local":
    TIME_ZONE = pytz.utc.zone

USE_I18N = True

USE_L10N = True

USE_TZ = True

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.9/howto/static-files/

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(KOLIBRI_HOME, "static")

# https://docs.djangoproject.com/en/1.9/ref/settings/#std:setting-LOGGING
# https://docs.djangoproject.com/en/1.9/topics/logging/

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '%(levelname)s %(asctime)s %(module)s %(process)d %(thread)d %(message)s'
        },
        'simple': {
            'format': '%(levelname)s %(message)s'
        },
        'simple_date': {
            'format': '%(levelname)s %(asctime)s %(module)s %(message)s'
        },
        'color': {
            '()': 'colorlog.ColoredFormatter',
            'format': '%(log_color)s%(levelname)-8s %(message)s',
            'log_colors': {
                'DEBUG': 'bold_black',
                'INFO': 'white',
                'WARNING': 'yellow',
                'ERROR': 'red',
                'CRITICAL': 'bold_red',
            },
        }
    },
    'filters': {
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        },
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'color'
        },
        'mail_admins': {
            'level': 'ERROR',
            'class': 'django.utils.log.AdminEmailHandler',
            'filters': ['require_debug_false'],
        },
        'request_debug': {
            'level': 'ERROR',
            'class': 'logging.StreamHandler',
            'formatter': 'color',
            'filters': ['require_debug_true'],
        },
        'file_debug': {
            'level': 'DEBUG',
            'filters': ['require_debug_true'],
            'class': 'logging.FileHandler',
            'filename': os.path.join(KOLIBRI_HOME, 'debug.log'),
            'formatter': 'simple_date',
        },
        'file': {
            'level': 'INFO',
            'filters': [],
            'class': 'logging.FileHandler',
            'filename': os.path.join(KOLIBRI_HOME, 'kolibri.log'),
            'formatter': 'simple_date',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'propagate': True,
        },
        'django.request': {
            'handlers': ['mail_admins', 'file', 'request_debug'],
            'level': 'ERROR',
            'propagate': False,
        },
        'kolibri': {
            'handlers': ['console', 'mail_admins', 'file', 'file_debug'],
            'level': 'INFO',
        },
        'iceqube': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': True,
        }
    }
}


# Customizing Django auth system
# https://docs.djangoproject.com/en/1.9/topics/auth/customizing/

AUTH_USER_MODEL = 'kolibriauth.FacilityUser'

AUTHENTICATION_BACKENDS = ['kolibri.auth.backends.FacilityUserBackend']


# Django REST Framework
# http://www.django-rest-framework.org/api-guide/settings/

REST_FRAMEWORK = {
    "UNAUTHENTICATED_USER": "kolibri.auth.models.KolibriAnonymousUser",
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
        'rest_framework_csv.renderers.CSVRenderer',
    ),
}

# System warnings to disable
# see https://docs.djangoproject.com/en/1.9/ref/settings/#silenced-system-checks
SILENCED_SYSTEM_CHECKS = ["auth.W004"]

# Configuration for Django JS Reverse
# https://github.com/ierror/django-js-reverse#options

JS_REVERSE_JS_VAR_NAME = 'kolibriUrls'

JS_REVERSE_EXCLUDE_NAMESPACES = ['admin', ]

ENABLE_DATA_BOOTSTRAPPING = True

SESSION_EXPIRE_AT_BROWSER_CLOSE = True

SESSION_COOKIE_AGE = 600

# morango specific settings
MORANGO_JSON_SERIALIZER_CLASS = "kolibri.auth.encoders"
