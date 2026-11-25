export function zipcontentArchiveUrl(storageUrl) {
  const url = new URL(storageUrl, window.location);
  const peer = url.searchParams.getAll('baseurl').find(Boolean);
  const filename = url.pathname.split('/').pop();
  const archivePath = peer ? `${encodeURIComponent(peer)}/${filename}` : filename;
  return new URL(`../../zipcontent/${archivePath}`, window.location).href;
}

export function zipcontentEntryUrl(archiveUrl, entryPath) {
  return `${archiveUrl}/${entryPath.split('/').map(encodeURIComponent).join('/')}`;
}
