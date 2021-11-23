# Docker-related files

This directory contains docker files and startup scripts for various tasks. See also the `docker-*` `make` commands in the _Makefile_  in the root directory.

## env.list

Docker environment variables

## base.dockerfile

Base layer that installs JavaScript and Python dependencies

## build_whl.dockerfile

Generates a `.whl`, `tar.gz`, and `.pex` files in `dist/`

## build_windows.dockerfile

Generate the Windows installer

## dev.dockerfile

Gull development setup with running devserver

## demoserver.dockerfile

Runs the pex from `KOLIBRI_PEX_URL` with production setup

## entrypoint.py

Startup script that configures Kolibri based on ENV variables:

* `KOLIBRI_PEX_URL`: Download URL or the string ``default``
* `DOCKERMNT_PEX_PATH`: Local path such as ``/docker/mnt/nameof.pex``
* `KOLIBRI_RUN_MODE`: set in Dockerfile
* `KOLIBRI_HOME`: default `/kolibrihome`
* `KOLIBRI_HTTP_PORT`: default `8080`
* `KOLIBRI_LANG`: default `en`
* `CHANNELS_TO_IMPORT`: comma-separated list of channel IDs (not set by default)

If the `KOLIBRI_PROVISIONDEVICE_FACILITY` environment variable is set, the entrypoint script will set up a facility with this name. The `KOLIBRI_LANG` environment variable and the following other environment variables will be used in the process:

* `KOLIBRI_PROVISIONDEVICE_PRESET`: defaults to `formal`, with the other options being `nonformal` and `informal`
* `KOLIBRI_PROVISIONDEVICE_SUPERUSERNAME`: default `devowner`
* `KOLIBRI_PROVISIONDEVICE_SUPERUSERPASSWORD`: default `admin123`
