FROM learningequality/kolibribase

ENV KOLIBRI_RUN_MODE=demoserver
ENV KOLIBRI_PROVISIONDEVICE_FACILITY="Kolibri Demo"
ENV WHICH_PYTHON=python2

COPY docker/entrypoint.py /docker/entrypoint.py

WORKDIR /kolibrihome

ENTRYPOINT ["python", "/docker/entrypoint.py"]
CMD ["kolibri", "start", "--foreground"]
