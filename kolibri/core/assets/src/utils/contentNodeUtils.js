/*
 * Given a ContentNode, returns the thumbnail URL.
 * A thumbnail URL is commonly saved in file objects of `files` attribute
 * however some simplified endpoints return it only in `thumbnail` attribute.
 * Therefore, if `thumbnail` attribute is availabe, its value is returned.
 * If it's not available, then the first file (if any) with a thumbnail
 * from `files` is returned.
 */
export function getContentNodeThumbnail(contentnode) {
  if (contentnode.thumbnail) {
    return contentnode.thumbnail;
  }
  if (!contentnode.files || !contentnode.files.length) {
    return null;
  }
  const fileWithThumbnail = contentnode.files.find(file => file.thumbnail && file.available);
  if (fileWithThumbnail) {
    return fileWithThumbnail.storage_url;
  }
  return null;
}
