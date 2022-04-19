import { MasteryModelTypes } from 'kolibri.coreVue.vuex.constants';

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

export function masteryModelValidator({ type, m, n }) {
  let isValid = true;
  const typeIsValid = Object.values(MasteryModelTypes).includes(type);
  if (!typeIsValid) {
    // eslint-disable-next-line no-console
    console.error(`Invalid mastery model type: ${type}`);
    isValid = false;
  }
  if (type === MasteryModelTypes.m_of_n) {
    if (typeof n !== 'number' || typeof m !== 'number') {
      // eslint-disable-next-line no-console
      console.error(`Invalid value of m and/or n. m: ${m}, n: ${n}`);
      isValid = false;
    }
  }
  return isValid;
}
