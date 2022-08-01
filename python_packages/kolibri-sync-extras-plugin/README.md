# Kolibri Sync Extras plugin

## What is this?

Kolibri is a Learning Management System / Learning App designed to run on low-power devices, targeting the needs of learners and teachers in contexts with limited infrastructure. See [learningequality.org/kolibri](https://learningequality.org/kolibri/) for more info.

Kolibri supports syncing facility data between two instances. This plugin provides additional sync related features that can be turned on to customize the behavior of those syncs. In particular, these features can enhance Kolibri's syncing mechanism when dealing with a large database or dataset.


## How can I install this plugin?

1. Inside your Kolibri virtual environment: `pip install kolibri-sync-extras-plugin`

2. Activate the plugin: `kolibri plugin enable kolibri_sync_extras_plugin`

3. Restart Kolibri


## Plugin configuration

The following configuration options are available, and should be defined within the `[Sync]` section of `$KOLIBRI_HOME/options.ini` or define environment variables with the prefix `KOLIBRI_SYNC_`.

| Option                             | Type | Default                           | Description                                                                  |
|------------------------------------| --- |-----------------------------------|------------------------------------------------------------------------------|
| `BACKGROUND_INITIALIZATION`        | Boolean | `False`                           | Whether to enable background initialization of pull syncs                    |
| `BACKGROUND_INITIALIZATION_STAGES` | String | `serializing,queuing`                    | Comma separated list of stages for which to enable background initialization |
| `BACKGROUND_FINALIZATION`          | Boolean | `False`                           | Whether to enable background finalization of push syncs                      |
| `BACKGROUND_FINALIZATION_STAGES`   | String | `dequeuing,deserializing,cleanup` | Comma separated list of stages for which to enable background finalization   |

### Example
```ini
[Sync]
BACKGROUND_INITIALIZATION = True
BACKGROUND_INITIALIZATION_STAGES = "serializing"
BACKGROUND_FINALIZATION = True
BACKGROUND_FINALIZATION_STAGES = "deserializing,cleanup"
```

## Development
### Getting started
```bash
$ pip install -r requirements-dev.txt
$ pre-commit install
$ KOLIBRI_HOME="$(pwd)/.kolibri" kolibri plugin enable kolibri_sync_extras_plugin
```

## Testing
### Getting started
```bash
$ pip install -r requirements.txt -r requirements-test.txt
$ KOLIBRI_HOME="$(pwd)/.kolibri" kolibri plugin enable kolibri_sync_extras_plugin
```

### Running them
```bash
$ pytest test/
```
