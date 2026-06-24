import isPlainObject from 'lodash/isPlainObject';
import cloneDeep from 'lodash/cloneDeep';
import { Resource } from 'kolibri/apiResource';
import urls from 'kolibri/urls';

/**
 * Type definition for Language metadata.
 * @typedef {object} Language
 * @property {string} id - An IETF language tag.
 * @property {string} lang_code - The ISO 639‑1 language code.
 * @property {string} lang_subcode - The regional identifier.
 * @property {string} lang_name - The name of the language in that language.
 * @property {('ltr'|'rtl')} lang_direction - Direction of the language's script; top to bottom
 * is not supported currently.
 */

/**
 * Type definition for AssessmentMetadata.
 * @typedef {object} AssessmentMetadata
 * @property {string[]} assessment_item_ids - An array of ids for assessment items.
 * @property {number} number_of_assessments - The length of assessment_item_ids.
 * @property {object} mastery_model - Object describing the mastery criterion for finishing
 * practice.
 * @property {boolean} randomize - Whether to randomize the order of assessments.
 * @property {boolean} is_manipulable - Whether this assessment can be programmatically updated.
 */

/**
 * Type definition for File.
 * @typedef {object} File
 * @property {string} id - id of the file object.
 * @property {string} checksum - md5 checksum of the file, used to generate the file name.
 * @property {boolean} available - Whether the file is available on the server.
 * @property {number} file_size - file_size in bytes.
 * @property {string} extension - File extension, also used to generate the file name.
 * @property {string} preset - The role that the file plays for this content node.
 * @property {Language|null} lang - The language of the File.
 * @property {boolean} supplementary - Whether this file is optional.
 * @property {boolean} thumbnail - Whether this file is a thumbnail.
 */

/**
 * Type definition for ContentNode metadata.
 * @typedef {object} ContentNode
 * @property {string} id - Unique id of the ContentNode.
 * @property {string} channel_id - Unique channel_id of the channel that the ContentNode is in.
 * @property {string} content_id - Identifier that is common across all instances of this resource.
 * @property {string} title - A title that summarizes this ContentNode for the user.
 * @property {string} description - Detailed description of the ContentNode.
 * @property {string} author - Author of the ContentNode.
 * @property {string} thumbnail_url - URL for the thumbnail for this ContentNode,
 * this may be any valid URL format including base64 encoded or blob URL.
 * @property {boolean} available - Whether the ContentNode has all necessary files for rendering.
 * @property {boolean} coach_content - Whether the ContentNode is intended only for coach users.
 * @property {Language|null} lang - The primary language of the ContentNode.
 * @property {string} license_description - The description of the license, which may be localized.
 * @property {string} license_name - The human readable name of the license, localized.
 * @property {string} license_owner - The name of the person or organization that holds copyright.
 * @property {number} num_coach_contents - Number of coach contents that are descendants of this.
 * @property {string} parent - The unique id of the parent of this ContentNode.
 * @property {number} sort_order - The order of display for this node in its channel
 * if depth recursion was not deep enough.
 * @property {string[]} tags - Tags that apply to this content.
 * @property {boolean} is_leaf - Whether is a leaf resource or not.
 * @property {AssessmentMetadata|null} assessmentmetadata - Additional metadata for assessments.
 * @property {File[]} files - Array of file objects associated with this ContentNode.
 * @property {object[]} ancestors - Array of objects with 'id' and 'title' properties.
 * @property {Children} [children] - Optional pagination object with children of this ContentNode.
 */

/**
 * Type definition for children pagination object.
 * @typedef {object} Children
 * @property {object} more - Parameters for requesting more objects.
 * @property {string} more.id - The id of the parent of these child nodes.
 * @property {object} more.params - The get parameters that should be used for requesting more
 * nodes.
 * @property {number} more.params.depth - 1 or 2, how deep the nesting should be returned.
 * @property {number} more.params.lft__gt - Integer value to return a lft value greater than.
 * @property {ContentNode[]} results - The array of ContentNodes for this page.
 */

export default new Resource({
  name: 'contentnode',
  fetchRandomCollection({ getParams: params }) {
    return this.getListEndpoint('random', params);
  },
  fetchDescendantsAssessments(ids) {
    return this.getListEndpoint('descendants_assessments', { ids });
  },
  fetchRecommendationsFor(id, getParams) {
    return this.fetchDetailCollection('recommendations_for', id, getParams);
  },
  fetchResume(params = { resume: true }) {
    const url = urls['kolibri:core:usercontentnode_list']();
    return this.client({ url, params }).then(response => {
      this.cacheData(response.data);
      return response.data;
    });
  },
  fetchPopular(params = { popular: true }) {
    const url = urls['kolibri:core:usercontentnode_list']();
    return this.client({ url, params }).then(response => {
      this.cacheData(response.data);
      return response.data;
    });
  },
  fetchNextSteps(params = { next_steps: true }) {
    const url = urls['kolibri:core:usercontentnode_list']();
    return this.client({ url, params }).then(response => {
      this.cacheData(response.data);
      return response.data;
    });
  },
  fetchLessonResources(lesson) {
    const url = urls['kolibri:core:usercontentnode_list']();
    return this.client({ url, params: { lesson } }).then(response => {
      this.cacheData(response.data);
      return response.data;
    });
  },
  cache: {},
  fetchModel({ id, getParams: params }) {
    if (this.cache[id]) {
      return Promise.resolve(cloneDeep(this.cache[id]));
    }
    return this.client({ url: this.modelUrl(id), params }).then(response => {
      this.cacheData(response.data);
      return response.data;
    });
  },
  cacheData(data) {
    if (Array.isArray(data)) {
      for (const model of data) {
        this.cacheData(model);
      }
    } else if (isPlainObject(data)) {
      if (data[this.idKey]) {
        this.cache[data[this.idKey]] = Object.assign(
          this.cache[data[this.idKey]] || {},
          cloneDeep(data),
        );
        if (data.children) {
          this.cacheData(data.children);
        }
      } else if (data.results) {
        for (const model of data.results) {
          this.cacheData(model);
        }
      }
    }
  },
  fetchCollection({ getParams: params }) {
    return this.client({ url: this.collectionUrl(), params }).then(response => {
      this.cacheData(response.data);
      return response.data;
    });
  },
  fetchTree({ id, params }) {
    const url = urls['kolibri:core:contentnode_tree_detail'](id);
    return this.client({ url, params }).then(response => {
      this.cacheData(response.data);
      return response.data;
    });
  },
  fetchBookmarks({ params }) {
    const url = urls['kolibri:core:contentnode_bookmarks_list']();
    return this.client({ url, params }).then(response => {
      this.cacheData(response.data);
      return response.data;
    });
  },
});
