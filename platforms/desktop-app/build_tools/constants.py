KOLIBRI_EXCLUDE_DIRS = [
    # remove the OIDC dependencies, as we won't use them here
    "src/kolibri/plugins/oidc_provider_plugin",
    "src/kolibri/dist/oidc_provider",
    "src/kolibri/dist/jwkest",
    "src/kolibri/dist/Cryptodome",

    # remove some assorted additional plugins
    "src/kolibri/plugins/demo_server",
    "src/kolibri/plugins/style_guide",

    # remove python2-only stuff
    "src/kolibri/dist/py2only",

    # remove pycountry and replace with stub
    # (only used by getlang_by_alpha2 in le-utils, which Kolibri doesn't call)
    "src/kolibri/dist/pycountry/*",

    # remove source maps
    "src/kolibri/**/*.js.map",

    # remove node_modules (contains only core-js)
    "src/kolibri/core/node_modules",

    # remove unused translation files from django and other apps
    "src/kolibri/dist/rest_framework/locale",
    "src/kolibri/dist/django_filters/locale",
    "src/kolibri/dist/mptt/locale",

    "src/kolibri/dist/django/contrib/admindocs/locale",
    "src/kolibri/dist/django/contrib/auth/locale",
    "src/kolibri/dist/django/contrib/sites/locale",
    "src/kolibri/dist/django/contrib/contenttypes/locale",
    "src/kolibri/dist/django/contrib/flatpages/locale",
    "src/kolibri/dist/django/contrib/sessions/locale",
    "src/kolibri/dist/django/contrib/humanize/locale",
    "src/kolibri/dist/django/contrib/admin/locale",

    # remove some django components entirely
    "src/kolibri/dist/django/contrib/gis",
    "src/kolibri/dist/django/contrib/redirects",
    "src/kolibri/dist/django/conf/app_template",
    "src/kolibri/dist/django/conf/project_template",
    "src/kolibri/dist/django/db/backends/postgresql_psycopg2",
    "src/kolibri/dist/django/db/backends/postgresql",
    "src/kolibri/dist/django/db/backends/mysql",
    "src/kolibri/dist/django/db/backends/oracle",
    "src/kolibri/dist/django/contrib/postgres",

    # remove bigger chunks of django admin (may not want to do this)
    "src/kolibri/dist/django/contrib/admin/static",
    "src/kolibri/dist/django/contrib/admin/templates",

    # other assorted testing stuff
    "src/kolibri/dist/tzlocal/test_data",

    # remove some unnecessary apps
    "src/kolibri/dist/redis_cache",
    "src/kolibri/dist/redis",

    # binaries for other platforms
    "src/kolibri/dist/cext/cp27",
    "src/kolibri/dist/cext/cp34",
    "src/kolibri/dist/cext/cp35",
    "src/kolibri/dist/cext/cp37"
]