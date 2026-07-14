// Deferred import to avoid circular dependency during module loading:
// ContentViewer/utils → kolibri → pluginMediator → ContentViewerError
// → DownloadButton → ContentViewer/utils
const getKolibri = () => require('kolibri').default;

export const getRenderableFiles = files =>
  files.filter(
    file =>
      !file.thumbnail &&
      !file.supplementary &&
      file.available &&
      getKolibri().presetViewerComponent(file.preset),
  );

export const getDefaultFile = files => (files && files.length ? files[0] : undefined);

export const getFilePreset = (file, preset) =>
  file ? file.preset : getKolibri().presetViewerComponent(preset) ? preset : null;
