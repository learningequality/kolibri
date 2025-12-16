The files in this directory are generated using the buildPerseus.js script inside this plugin.
They should be regenerated using the same command in the unlikely event that Perseus ever needs
to be updated.
The script is run using the following command: yarn workspace kolibri-perseus-viewer run build-perseus.
This will automatically pull files from Perseus and make appropriate edits,
and then copy and build relevant files from there into the static and assets/dist folders in this plugin.
