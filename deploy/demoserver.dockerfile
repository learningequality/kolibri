FROM learningequality/kolibribase

ENV KOLIBRI_RUN_MODE=demoserver
ENV KOLIBRI_PROVISIONDEVICE_FACILITY="Kolibri Demo"
ENV WHICH_PYTHON=python2

COPY deploy/entrypoint.py /deploy/entrypoint.py

WORKDIR /kolibrihome

ENTRYPOINT ["python", "/deploy/entrypoint.py"]
CMD ["kolibri", "start", "--foreground"]
