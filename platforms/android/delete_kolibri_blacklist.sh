# remove the OIDC dependencies, as we won't use them here
rm -r src/kolibri/plugins/oidc_provider_plugin
rm -r src/kolibri/dist/oidc_provider
rm -r src/kolibri/dist/jwkest
rm -r src/kolibri/dist/Cryptodome

# remove some assorted additional plugins
rm -r src/kolibri/plugins/demo_server
rm -r src/kolibri/plugins/style_guide

# remove pycountry and replace with stub
# (only used by getlang_by_alpha2 in le-utils, which Kolibri doesn't call)
rm -r src/kolibri/dist/pycountry/*
touch src/kolibri/dist/pycountry/__init__.py

# remove source maps
find src/kolibri -name "*.js.map" -type f -delete

# remove node_modules (contains only core-js)
rm -r src/kolibri/core/node_modules

# remove unused translation files from django and other apps
rm -r src/kolibri/dist/rest_framework/locale
rm -r src/kolibri/dist/django_filters/locale
rm -r src/kolibri/dist/mptt/locale

rm -r src/kolibri/dist/django/contrib/admindocs/locale
rm -r src/kolibri/dist/django/contrib/auth/locale
rm -r src/kolibri/dist/django/contrib/sites/locale
rm -r src/kolibri/dist/django/contrib/contenttypes/locale
rm -r src/kolibri/dist/django/contrib/flatpages/locale
rm -r src/kolibri/dist/django/contrib/sessions/locale
rm -r src/kolibri/dist/django/contrib/humanize/locale
rm -r src/kolibri/dist/django/contrib/admin/locale

# remove some django components entirely
rm -r src/kolibri/dist/django/contrib/gis
rm -r src/kolibri/dist/django/contrib/redirects
rm -r src/kolibri/dist/django/conf/app_template
rm -r src/kolibri/dist/django/conf/project_template
rm -r src/kolibri/dist/django/db/backends/postgresql_psycopg2
rm -r src/kolibri/dist/django/db/backends/postgresql
rm -r src/kolibri/dist/django/db/backends/mysql
rm -r src/kolibri/dist/django/db/backends/oracle
rm -r src/kolibri/dist/django/contrib/postgres

# remove bigger chunks of django admin (may not want to do this)
rm -r src/kolibri/dist/django/contrib/admin/static
rm -r src/kolibri/dist/django/contrib/admin/templates

# other assorted testing stuff
find src/kolibri -wholename "*/test/*" -not -wholename "*/django/test/*" -delete
rm -r src/kolibri/dist/tzlocal/test_data

# remove some unnecessary apps
rm -r src/kolibri/dist/redis_cache
rm -r src/kolibri/dist/redis