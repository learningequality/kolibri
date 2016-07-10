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

# This is essential! We load the kolibri conf INSIDE the Django conf
from kolibri.utils import conf

BASE_DIR = os.path.abspath(os.path.dirname(__name__))

KOLIBRI_HOME = os.environ['KOLIBRI_HOME']

KOLIBRI_CORE_JS_NAME = 'kolibriGlobal'

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
    'kolibri.core.webpack',
    'rest_framework',
    'django_js_reverse',
] + conf.config['INSTALLED_APPS']

MIDDLEWARE_CLASSES = (
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'kolibri.auth.middleware.CustomAuthenticationMiddleware',
    'kolibri.content.middleware.ContentDBRoutingMiddleware',
    'django.contrib.auth.middleware.SessionAuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'django.middleware.security.SecurityMiddleware',
)

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
        'NAME': os.path.join(conf.KOLIBRI_HOME, 'db.sqlite3'),
    }
}

# Enable dynamic routing for content databases
DATABASE_ROUTERS = ['kolibri.content.content_db_router.ContentDBRouter']


# Content directories and URLs for channel metadata and content files

# Directory and URL for storing content databases for channel data
CONTENT_DATABASE_DIR = os.path.join(KOLIBRI_HOME, 'content', 'databases')
CONTENT_DATABASE_URL = '/content/databases/'

# Directory and URL for storing de-duped content files for all channels
CONTENT_STORAGE_DIR = os.path.join(KOLIBRI_HOME, 'content', 'storage')
CONTENT_STORAGE_URL = '/content/storage/'


# Internationalization
# https://docs.djangoproject.com/en/1.9/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_L10N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.9/howto/static-files/

STATIC_URL = '/static/'


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
}


# Configuration for Django JS Reverse
# https://github.com/ierror/django-js-reverse#options

JS_REVERSE_JS_VAR_NAME = 'urls'

JS_REVERSE_JS_GLOBAL_OBJECT_NAME = KOLIBRI_CORE_JS_NAME

JS_REVERSE_EXCLUDE_NAMESPACES = ['admin', ]
