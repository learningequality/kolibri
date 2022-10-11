
# New Branding

## Install for development and publishing

Clone the plugin repo and enable your Kolibri virtual environment. Install plugin locally for development with `pip` using `-e`:

```bash
cd kolibri-new-branding-plugin
pip install -e .
```

Disable the default theme and enable the new plugin:

```bash
kolibri plugin disable kolibri.plugins.default_theme
kolibri plugin enable kolibri_new_branding_plugin
```

Now when you start Kolibri the new theme should be active.

## Install for production

Steps:

* Install plugin with `pip`
* Disable the default theme
* Enable the plugin

For example:

```bash
pip install git+https://github.com/learningequality/kolibri-new-branding-plugin --upgrade --no-cache-dir
kolibri plugin disable kolibri.plugins.default_theme
kolibri plugin enable kolibri_new_branding_plugin
```

Now when you start Kolibri the new theme should be active.
