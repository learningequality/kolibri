/* Copyright 2014 Mozilla Foundation
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
 * https://github.com/mozilla/pdf.js/blob/v2.14.305/web/annotation_layer_builder.js
 */

// Modified: typedef imports deleted
// Original line: 16

/* eslint-disable */

import { AnnotationLayer } from 'pdfjs-dist/legacy/build/pdf';

function getL10nFallback(key, args) {
  switch (key) {
    case 'find_match_count':
      key = `find_match_count[${args.total === 1 ? 'one' : 'other'}]`;
      break;
    case 'find_match_count_limit':
      key = `find_match_count_limit[${args.limit === 1 ? 'one' : 'other'}]`;
      break;
  }
  return DEFAULT_L10N_STRINGS[key] || '';
}

// Replaces {{arguments}} with their values.
function formatL10nValue(text, args) {
  if (!args) {
    return text;
  }
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (all, name) => {
    return name in args ? args[name] : '{{' + name + '}}';
  });
}

/**
 * No-op implementation of the localization service.
 * @implements {IL10n}
 */
const NullL10n = {
  getLanguage() {
    return 'en-us';
  },

  getDirection() {
    return 'ltr';
  },

  get(key, args = null, fallback = getL10nFallback(key, args)) {
    return formatL10nValue(fallback, args);
  },

  translate(element) {},
};

/**
 * @typedef {Object} AnnotationLayerBuilderOptions
 * @property {HTMLDivElement} pageDiv
 * @property {PDFPageProxy} pdfPage
 * @property {AnnotationStorage} [annotationStorage]
 * @property {string} [imageResourcesPath] - Path for image resources, mainly
 *   for annotation icons. Include trailing slash.
 * @property {boolean} renderForms
 * @property {IPDFLinkService} linkService
 * @property {IDownloadManager} downloadManager
 * @property {IL10n} l10n - Localization service.
 * @property {boolean} [enableScripting]
 * @property {Promise<boolean>} [hasJSActionsPromise]
 * @property {Promise<Object<string, Array<Object>> | null>}
 *   [fieldObjectsPromise]
 * @property {Object} [mouseState]
 * @property {Map<string, HTMLCanvasElement>} [annotationCanvasMap]
 */

class AnnotationLayerBuilder {
  /**
   * @param {AnnotationLayerBuilderOptions} options
   */
  constructor({
    pageDiv,
    pdfPage,
    linkService,
    downloadManager,
    annotationStorage = null,
    imageResourcesPath = '',
    renderForms = true,
    l10n = NullL10n,
    enableScripting = false,
    hasJSActionsPromise = null,
    fieldObjectsPromise = null,
    mouseState = null,
    annotationCanvasMap = null,
  }) {
    this.pageDiv = pageDiv;
    this.pdfPage = pdfPage;
    this.linkService = linkService;
    this.downloadManager = downloadManager;
    this.imageResourcesPath = imageResourcesPath;
    this.renderForms = renderForms;
    this.l10n = l10n;
    this.annotationStorage = annotationStorage;
    this.enableScripting = enableScripting;
    this._hasJSActionsPromise = hasJSActionsPromise;
    this._fieldObjectsPromise = fieldObjectsPromise;
    this._mouseState = mouseState;
    this._annotationCanvasMap = annotationCanvasMap;

    this.div = null;
    this._cancelled = false;
  }

  /**
   * @param {PageViewport} viewport
   * @param {string} intent (default value is 'display')
   * @returns {Promise<void>} A promise that is resolved when rendering of the
   *   annotations is complete.
   */
  render(viewport, intent = 'display') {
    Promise.all([
      this.pdfPage.getAnnotations({ intent }),
      this._hasJSActionsPromise,
      this._fieldObjectsPromise,
    ]).then(([annotations, hasJSActions, fieldObjects]) => {
      if (this._cancelled || annotations.length === 0) {
        return;
      }

      const parameters = {
        viewport: viewport.clone({ dontFlip: true }),
        div: this.div,
        annotations,
        page: this.pdfPage,
        imageResourcesPath: this.imageResourcesPath,
        renderForms: this.renderForms,
        linkService: this.linkService,
        downloadManager: this.downloadManager,
        annotationStorage: this.annotationStorage,
        enableScripting: this.enableScripting,
        hasJSActions,
        fieldObjects,
        mouseState: this._mouseState,
        annotationCanvasMap: this._annotationCanvasMap,
      };

      if (this.div) {
        // If an annotationLayer already exists, refresh its children's
        // transformation matrices.
        AnnotationLayer.update(parameters);
      } else {
        // Create an annotation layer div and render the annotations
        // if there is at least one annotation.
        this.div = document.createElement('div');
        this.div.className = 'annotationLayer';
        this.pageDiv.appendChild(this.div);
        parameters.div = this.div;

        AnnotationLayer.render(parameters);
        this.l10n.translate(this.div);
      }
    });
  }

  cancel() {
    this._cancelled = true;
  }

  hide() {
    if (!this.div) {
      return;
    }
    this.div.hidden = true;
  }
}

export { AnnotationLayerBuilder };
