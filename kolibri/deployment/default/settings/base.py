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

import os

import pytz
from django.conf import locale
from six.moves.urllib.parse import urljoin
from tzlocal import get_localzone

import kolibri
from kolibri.utils import conf
from kolibri.utils import i18n

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
# import kolibri, so we can get the path to the module.
# we load other utilities related to i18n
# This is essential! We load the kolibri conf INSIDE the Django conf

KOLIBRI_MODULE_PATH = os.path.dirname(kolibri.__file__)

BASE_DIR = os.path.abspath(os.path.dirname(__name__))

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
    'kolibri.core.auth.apps.KolibriAuthConfig',
    'kolibri.core.content',
    'kolibri.core.logger',
    'kolibri.core.notifications.apps.KolibriNotificationsConfig',
    'kolibri.core.tasks.apps.KolibriTasksConfig',
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
    'kolibri.core.device.middleware.IgnoreGUIMiddleware',
    'django.middleware.gzip.GZipMiddleware',
    'django.middleware.cache.UpdateCacheMiddleware',
    'kolibri.core.analytics.middleware.MetricsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'kolibri.core.device.middleware.KolibriLocaleMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'kolibri.core.auth.middleware.CustomAuthenticationMiddleware',
    'kolibri.core.middleware.signin_page.RedirectToSignInPageIfNoGuestAccessAndNoActiveSession',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.cache.FetchFromCacheMiddleware',
]

QUEUE_JOB_STORAGE_PATH = os.path.join(conf.KOLIBRI_HOME, "job_storage.sqlite3")

# By default don't cache anything unless it explicitly requests it to!
CACHE_MIDDLEWARE_SECONDS = 0

CACHES = {
    # Default cache
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    },
    # Cache for builtfiles - frontend assets that only change on upgrade.
    'built_files': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    },
}

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
                'kolibri.core.context_processors.custom_context_processor.supported_browser',
                'kolibri.core.context_processors.custom_context_processor.developer_mode',
            ],
        },
    },
]

WSGI_APPLICATION = 'kolibri.deployment.default.wsgi.application'


# Database
# https://docs.djangoproject.com/en/1.9/ref/settings/#databases

if conf.OPTIONS['Database']["DATABASE_ENGINE"] == "sqlite":
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': os.path.join(conf.KOLIBRI_HOME, conf.OPTIONS['Database']['DATABASE_NAME'] or 'db.sqlite3'),
            'OPTIONS': {
                'timeout': 100,
            }
        },
        'notifications_db': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': os.path.join(conf.KOLIBRI_HOME, 'notifications.sqlite3'),
            'OPTIONS': {
                'timeout': 100,
            }
        }
    }
    DATABASE_ROUTERS = ('kolibri.core.notifications.models.NotificationsRouter', )

elif conf.OPTIONS['Database']['DATABASE_ENGINE'] == "postgres":
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': conf.OPTIONS['Database']['DATABASE_NAME'],
            'PASSWORD': conf.OPTIONS['Database']['DATABASE_PASSWORD'],
            'USER': conf.OPTIONS['Database']['DATABASE_USER'],
            'HOST': conf.OPTIONS['Database']['DATABASE_HOST'],
            'PORT': conf.OPTIONS['Database']['DATABASE_PORT'],
        }
    }


# Internationalization
# https://docs.djangoproject.com/en/1.9/topics/i18n/

# For language names, see:
# https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
# http://helpsharepointvision.nevron.com/Culture_Table.html

# django-specific format, e.g.: [ ('bn-bd', 'বাংলা'), ('en', 'English'), ...]
LANGUAGES = [
    (lang["intl_code"], lang["language_name"])
    for lang in i18n.KOLIBRI_SUPPORTED_LANGUAGES
]

# Some languages are not supported out-of-the-box by Django
# Here, we use the language code in Intl.js
EXTRA_LANG_INFO = {
    'ff-cm': {
        'bidi': False,
        'code': 'ff-cm',
        'name': 'Fulfulde (Cameroon)',
        'name_local': 'Fulfulde Mbororoore',
    },
    'fr-ht': {
        'bidi': False,
        'code': 'fr-ht',
        'name': 'Haitian Creole',
        'name_local': 'Kreyòl ayisyen',
    },
    'gu-in': {
        'bidi': False,
        'code': 'gu-in',
        'name': 'Gujarati',
        'name_local': 'ગુજરાતી',
    },
    'nyn': {
        'bidi': False,
        'code': 'nyn',
        'name': 'Chichewa, Chewa, Nyanja',
        'name_local': 'Chinyanja',
    },
    'yo': {
        'bidi': False,
        'code': 'yo',
        'name': 'Yoruba',
        'name_local': 'Yorùbá',
    },
    'zu': {
        'bidi': False,
        'code': 'zu',
        'name': 'Zulu',
        'name_local': 'isiZulu',
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

path_prefix = conf.OPTIONS['Deployment']['URL_PATH_PREFIX']

if path_prefix != '/':
    path_prefix = '/' + path_prefix

STATIC_URL = urljoin(path_prefix, 'static/')
STATIC_ROOT = os.path.join(conf.KOLIBRI_HOME, "static")

# https://docs.djangoproject.com/en/1.11/ref/settings/#csrf-cookie-path
# Ensure that our CSRF cookie does not collide with other CSRF cookies
# set by other Django apps served from the same domain.
CSRF_COOKIE_PATH = path_prefix

# https://docs.djangoproject.com/en/1.11/ref/settings/#language-cookie-path
# Ensure that our language cookie does not collide with other language
# cookies set by other Django apps served from the same domain.
LANGUAGE_COOKIE_PATH = path_prefix

# https://docs.djangoproject.com/en/1.11/ref/settings/#session-cookie-path
# Ensure that our session cookie does not collidge with other session cookies
# set by other Django apps served from the same domain.
SESSION_COOKIE_PATH = path_prefix

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
            'filename': os.path.join(conf.KOLIBRI_HOME, 'debug.log'),
            'formatter': 'simple_date',
        },
        'file': {
            'level': 'INFO',
            'filters': [],
            'class': 'logging.FileHandler',
            'filename': os.path.join(conf.KOLIBRI_HOME, 'kolibri.log'),
            'formatter': 'simple_date',
        }
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
            'propagate': False,
        },
        'iceqube': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': True,
        },
        'morango': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': True,
        }
    }
}


# Customizing Django auth system
# https://docs.djangoproject.com/en/1.9/topics/auth/customizing/

AUTH_USER_MODEL = 'kolibriauth.FacilityUser'

AUTHENTICATION_BACKENDS = ['kolibri.core.auth.backends.FacilityUserBackend']


# Django REST Framework
# http://www.django-rest-framework.org/api-guide/settings/

REST_FRAMEWORK = {
    "UNAUTHENTICATED_USER": "kolibri.core.auth.models.KolibriAnonymousUser",
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
        'rest_framework_csv.renderers.CSVRenderer',
    ),
    'EXCEPTION_HANDLER': 'kolibri.core.utils.custom_exception_handler',
}

# System warnings to disable
# see https://docs.djangoproject.com/en/1.9/ref/settings/#silenced-system-checks
SILENCED_SYSTEM_CHECKS = ["auth.W004"]

# Configuration for Django JS Reverse
# https://github.com/ierror/django-js-reverse#options

JS_REVERSE_EXCLUDE_NAMESPACES = ['admin', ]

ENABLE_DATA_BOOTSTRAPPING = True

# Session configuration

SESSION_ENGINE = "django.contrib.sessions.backends.file"

SESSION_FILE_PATH = os.path.join(conf.KOLIBRI_HOME, "sessions")

if not os.path.exists(SESSION_FILE_PATH):
    if not os.path.exists(conf.KOLIBRI_HOME):
        raise RuntimeError("The KOLIBRI_HOME dir does not exist")
    os.mkdir(SESSION_FILE_PATH)

SESSION_COOKIE_NAME = "kolibri"

SESSION_EXPIRE_AT_BROWSER_CLOSE = True

SESSION_COOKIE_AGE = 600


if conf.OPTIONS['Debug']['SENTRY_BACKEND_DSN']:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration

    sentry_sdk.init(
        dsn=conf.OPTIONS['Debug']['SENTRY_BACKEND_DSN'],
        integrations=[DjangoIntegration()],
        release=kolibri.__version__,
    )

    print("Sentry backend error logging is enabled")
