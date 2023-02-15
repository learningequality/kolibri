/* Copyright 2015 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*
 * This file has been modified to adapt the component to the needs of Kolibri
 * The original file is available at:
 * https://github.com/mozilla/pdf.js/blob/v2.14.305/web/pdf_link_service.js
 */

// Modified: typedef imports deleted
// Original line: 16

/* eslint-disable */

const DEFAULT_LINK_REL = 'noopener noreferrer nofollow';

const LinkTarget = {
  NONE: 0, // Default value.
  SELF: 1,
  BLANK: 2,
  PARENT: 3,
  TOP: 4,
};

const NullCharactersRegExp = /\x00/g;
const InvisibleCharactersRegExp = /[\x01-\x1F]/g;

/**
 * @param {string} str
 * @param {boolean} [replaceInvisible]
 */
function removeNullCharacters(str, replaceInvisible = false) {
  if (typeof str !== 'string') {
    console.error(`The argument must be a string.`);
    return str;
  }
  if (replaceInvisible) {
    str = str.replace(InvisibleCharactersRegExp, ' ');
  }
  return str.replace(NullCharactersRegExp, '');
}

/**
 * Adds various attributes (href, title, target, rel) to hyperlinks.
 * @param {HTMLAnchorElement} link - The link element.
 * @param {ExternalLinkParameters} params
 */
function addLinkAttributes(link, { url, target, rel, enabled = true } = {}) {
  if (!url || typeof url !== 'string') {
    throw new Error('A valid "url" parameter must provided.');
  }

  const urlNullRemoved = removeNullCharacters(url);
  if (enabled) {
    link.href = link.title = urlNullRemoved;
  } else {
    link.href = '';
    link.title = `Disabled: ${urlNullRemoved}`;
    link.onclick = () => {
      return false;
    };
  }

  let targetStr = ''; // LinkTarget.NONE
  // Modified: default targets as _blank
  // Original line: 16
  switch (target) {
    case LinkTarget.NONE:
      targetStr = '_blank';
      break;
    case LinkTarget.SELF:
      targetStr = '_self';
      break;
    case LinkTarget.BLANK:
      targetStr = '_blank';
      break;
    case LinkTarget.PARENT:
      targetStr = '_parent';
      break;
    case LinkTarget.TOP:
      targetStr = '_top';
      break;
    default:
      targetStr = '_blank';
  }
  link.target = targetStr;

  link.rel = typeof rel === 'string' ? rel : DEFAULT_LINK_REL;
}

/**
 * @implements {IPDFLinkService}
 */
class SimpleLinkService {
  constructor() {
    this.externalLinkEnabled = true;
  }

  /**
   * @type {number}
   */
  get pagesCount() {
    return 0;
  }

  /**
   * @type {number}
   */
  get page() {
    return 0;
  }

  /**
   * @param {number} value
   */
  set page(value) {}

  /**
   * @type {number}
   */
  get rotation() {
    return 0;
  }

  /**
   * @param {number} value
   */
  set rotation(value) {}

  /**
   * @param {string|Array} dest - The named, or explicit, PDF destination.
   */
  goToDestination(dest) {}

  /**
   * @param {number|string} val - The page number, or page label.
   */
  goToPage(val) {}

  /**
   * @param {HTMLAnchorElement} link
   * @param {string} url
   * @param {boolean} [newWindow]
   */
  addLinkAttributes(link, url, newWindow = false) {
    addLinkAttributes(link, { url, enabled: this.externalLinkEnabled });
  }

  /**
   * @param dest - The PDF destination object.
   * @returns {string} The hyperlink to the PDF object.
   */
  getDestinationHash(dest) {
    return '#';
  }

  /**
   * @param hash - The PDF parameters/hash.
   * @returns {string} The hyperlink to the PDF object.
   */
  getAnchorUrl(hash) {
    return '#';
  }

  /**
   * @param {string} hash
   */
  setHash(hash) {}

  /**
   * @param {string} action
   */
  executeNamedAction(action) {}

  /**
   * @param {number} pageNum - page number.
   * @param {Object} pageRef - reference to the page.
   */
  cachePageRef(pageNum, pageRef) {}

  /**
   * @param {number} pageNumber
   */
  isPageVisible(pageNumber) {
    return true;
  }

  /**
   * @param {number} pageNumber
   */
  isPageCached(pageNumber) {
    return true;
  }
}

export { LinkTarget, SimpleLinkService };
