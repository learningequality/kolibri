BROKER_URL = 'sqla+sqlite:///results.sqlite3'
CELERY_RESULT_BACKEND = 'db+sqlite:///results.sqlite3'

CELERY_TASK_SERIALIZER = 'pickle'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_ACCEPT_CONTENT = ['pickle', 'json']
CELERY_TIMEZONE = 'Europe/Oslo'
CELERY_ENABLE_UTC = True
