# The minimal production environment for Kolibri apps.
# This should have only the dependencies to download a pex file,
# and run it.
FROM python:2.7.15

COPY deploy /deploy
ENTRYPOINT ["python", "/deploy/entrypoint.py"]
CMD ["start", "--foreground"]
