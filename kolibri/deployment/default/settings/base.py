# -*- coding: utf-8 -*-
"""
Django settings for kolibri project.

For more information on this file, see
https://docs.djangoproject.com/en/1.9/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/1.9/ref/settings/
"""
from __future__ import absolute_import, print_function, unicode_literals

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
import os

# import kolibri, so we can get the path to the module.
import kolibri
# we load other utilities related to i18n
# This is essential! We load the kolibri conf INSIDE the Django conf
from kolibri.utils import conf, i18n
from tzlocal import get_localzone

KOLIBRI_MODULE_PATH = os.path.dirname(kolibri.__file__)

BASE_DIR = os.path.abspath(os.path.dirname(__name__))

KOLIBRI_HOME = os.environ['KOLIBRI_HOME']

KOLIBRI_CORE_JS_NAME = 'kolibriGlobal'

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
    'kolibri.auth.apps.KolibriAuthConfig',
    'kolibri.content',
    'kolibri.logger',
    'kolibri.tasks.apps.KolibriTasksConfig',
    'kolibri.core.webpack',
    'kolibri.core.exams',
    'kolibri.core.discovery',
    'rest_framework',
    'django_js_reverse',
    'jsonfield',
    'morango',
] + conf.config['INSTALLED_APPS']

# Add in the external plugins' locale paths. Our frontend messages depends
# specifically on the value of LOCALE_PATHS to find its catalog files.
LOCALE_PATHS += [
    i18n.get_installed_app_locale_path(app) for app in INSTALLED_APPS
    if i18n.is_external_plugin(app)
]

MIDDLEWARE_CLASSES = (
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'kolibri.plugins.setup_wizard.middleware.SetupWizardMiddleware',
    'kolibri.auth.middleware.CustomAuthenticationMiddleware',
    # 'kolibri.content.middleware.ContentDBRoutingMiddleware',  # TODO: test removing this middlware in next iteatoin
    'django.contrib.auth.middleware.SessionAuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'django.middleware.security.SecurityMiddleware',
)

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

# Enable dynamic routing for content databases
DATABASE_ROUTERS = [
    # note: the content db router seems to override any other routers you put in here. Make sure it's the last.
    'kolibri.content.content_db_router.ContentDBRouter']

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
CENTRAL_CONTENT_DOWNLOAD_BASE_URL = "https://contentworkshop.learningequality.org"

# Internationalization
# https://docs.djangoproject.com/en/1.9/topics/i18n/

LANGUAGES = [
    ('en', 'English'),
    ('sw-tz', 'Kiswahili'),
    ('es-es', 'Español'),
    ('es-mx', 'Español (México)'),
    ('fr-fr', 'Français, langue française'),
    ('pt-pt', 'Português'),
    ('hi-in', 'हिंदी'),
]

LANGUAGE_CODE = conf.config.get("LANGUAGE_CODE") or "en-us"

TIME_ZONE = get_localzone().zone

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
            'format': '%(levelname)s %(asctime)s(%(thread)d) %(module)s %(process)d %(thread)d %(message)s'
        },
        'simple': {
            'format': '%(levelname)s %(message)s'
        },
        'simple_date': {
            'format': '%(levelname)s %(asctime)s(%(thread)d) %(module)s %(message)s'
        },
        'color': {
            '()': 'colorlog.ColoredFormatter',
            'format': '%(log_color)s%(levelname)-8s (%(thread)d) %(message)s',
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
            'handlers': ['mail_admins', 'file'],
            'level': 'ERROR',
            'propagate': False,
        },
        'kolibri': {
            'handlers': ['console', 'mail_admins', 'file', 'file_debug'],
            'level': 'INFO',
        }
    }
}


# Customizing Django auth system
# https://docs.djangoproject.com/en/1.9/topics/auth/customizing/

AUTH_USER_MODEL = 'kolibriauth.DeviceOwner'

AUTHENTICATION_BACKENDS = ['kolibri.auth.backends.DeviceOwnerBackend', 'kolibri.auth.backends.FacilityUserBackend']


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
