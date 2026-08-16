import { ref, watch } from 'vue';
import logger from 'kolibri-logging';

const logging = logger.getLogger(__filename);

function perseusPaths(xmlDoc) {
  if (!xmlDoc) {
    return [];
  }
  const paths = [];
  for (const node of xmlDoc.querySelectorAll('qti-custom-interaction[data-type="perseus"]')) {
    const path = node.getAttribute('data-perseus-path');
    if (path) {
      paths.push(path);
    } else {
      logging.error('A perseus custom interaction declares no data-perseus-path');
    }
  }
  return paths;
}

async function extractPerseusItem(path, qtiPackage, qtiResource) {
  // Studio publishes an item's assets in an `images/` dir beside its JSON
  // (learningequality/studio#6047), so they can be found without parsing it.
  const imagesDir = path.replace(/[^/]+$/, '') + 'images/';
  const assetPaths = qtiResource.files.filter(file => file.startsWith(imagesDir));

  const [itemFile, ...assetFiles] = await Promise.all(
    [path, ...assetPaths].map(filePath => qtiPackage.getFile(filePath)),
  );

  if (!itemFile) {
    throw new Error(`The package has no file at ${path}`);
  }

  const packageFiles = {};
  assetPaths.forEach((assetPath, index) => {
    if (assetFiles[index]) {
      packageFiles[assetPath] = assetFiles[index].toUrl();
    }
  });

  return {
    perseusItemString: itemFile.toString(),
    packageFiles,
    sourceId: `qti-perseus:${path}`,
  };
}

export default function usePerseusItems(xmlDoc, qtiPackage, qtiResource) {
  const perseusItems = ref({});
  const loading = ref(false);

  let extractToken = 0;
  watch(
    [xmlDoc, qtiPackage, qtiResource],
    async ([doc, pkg, resource]) => {
      const token = ++extractToken;
      const paths = perseusPaths(doc);
      const extracted = {};

      if (paths.length && (!pkg || !resource)) {
        logging.error('A perseus custom interaction can only render from a QTI package');
      } else if (paths.length) {
        loading.value = true;
        await Promise.all(
          paths.map(path =>
            extractPerseusItem(path, pkg, resource)
              .then(item => {
                extracted[path] = item;
              })
              .catch(error => {
                logging.error(`Failed to extract the Perseus item at ${path}`, error);
              }),
          ),
        );
      }

      if (token !== extractToken) {
        return;
      }
      perseusItems.value = extracted;
      loading.value = false;
    },
    { immediate: true },
  );

  return { perseusItems, loading };
}
