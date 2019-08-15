/**
 * Given a file, it will return the checksum based on the
 * storage URL.
 */
export function checksumFromFile(file) {
  if (file.hasOwnProperty('storage_url')) {
    let splitUrl = file.storage_url.split('/');
    let filename = splitUrl[splitUrl.length - 1];
    return filename.split('.')[0];
  } else {
    return null;
  }
}
