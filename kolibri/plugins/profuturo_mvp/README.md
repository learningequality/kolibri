
# ProFuturo MVP Kolibri Plugin

This Kolibri plugin is temporarily located inside the Kolibri repo, but must be moved into a new repo before merging this branch back into the mainline.

The plugin is responsible for:

* setting theme custom Profuturo theme
* setting Profuturo-specific sandbox settings for the SCORM/HTML5 apps
* setting options to enable experimental user import functionality


## Items to change before merging

* remove this plugin
* revert changes in `default_plugins.txt` and `kolibri/__init__.py`
* update the `sandbox` in the HTML5 renderer back to `allow-scripts`
