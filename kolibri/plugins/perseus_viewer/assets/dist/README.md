The files in this directory are generated using the buildPerseus.js script inside this plugin.
They should be regenerated using the same command in the unlikely event that Perseus ever needs
to be updated.
The script is run using the following command: yarn workspace kolibri-perseus-viewer run build-perseus.
This will automatically pull the latest version of Perseus and its submodules from the Learning Equality fork,
and then copy and build relevant files from there into the static and assets/dist folders in this plugin.
This is to avoid having to run a build of Perseus every time the wrapper code for the plugin is updated.
