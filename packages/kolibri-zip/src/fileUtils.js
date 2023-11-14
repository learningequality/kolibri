export function getAbsoluteFilePath(baseFilePath, relativeFilePath) {
  // Construct a URL with a dummy base so that we can concatenate the
  // dependency URL with the URL relative to the dependency
  // and then read the pathname to get the new path.
  // Take substring to remove the leading slash to match the reference file paths
  // in packageFiles.
  try {
    return new URL(relativeFilePath, new URL(baseFilePath, 'http://b.b/')).pathname.substring(1);
  } catch (e) {
    console.debug('Error during URL handling', e); // eslint-disable-line no-console
  }
  return null;
}

// Looks for any URLs referenced inside url()
// Handle any query parameters separately.
const cssPathRegex = /(url\(['"]?)([^?"')]+)?(\?[^'"]+)?(['"]?\))/g;

export function getCSSPaths(fileContents) {
  return Array.from(fileContents.matchAll(cssPathRegex), ([, , p2]) => p2);
}

export function replaceCSSPaths(fileContents, packageFiles) {
  return fileContents.replace(cssPathRegex, function(match, p1, p2, p3, p4) {
    try {
      // Look to see if there is a URL in our packageFiles mapping that
      // that has this as the source path.
      const newUrl = packageFiles[p2];
      if (newUrl) {
        // If so, replace the instance with the new URL.
        return `${p1}${newUrl}${p4}`;
      }
    } catch (e) {
      console.debug('Error during URL handling', e); // eslint-disable-line no-console
    }
    // Otherwise just return the match so that it is unchanged.
    return match;
  });
}

export const defaultFilePathMappers = {
  css: {
    getPaths: getCSSPaths,
    replacePaths: replaceCSSPaths,
  },
};
