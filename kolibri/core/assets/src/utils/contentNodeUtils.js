/*
 * Given a ContentNode, returns the thumbnail URL of the first file (if any) with a thumbnail
 */
export function getContentNodeThumbnail(contentnode) {
  const fileWithThumbnail = contentnode.files.find(file => file.thumbnail && file.available);
  if (fileWithThumbnail) {
    return fileWithThumbnail.storage_url;
  }
  return null;
}
