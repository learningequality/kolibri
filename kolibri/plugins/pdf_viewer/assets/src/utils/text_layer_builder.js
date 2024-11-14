/* Copyright 2012 Mozilla Foundation
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
 * https://github.com/mozilla/pdf.js/blob/v2.14.305/web/text_layer_builder.js
 */

// Modified: typedef imports deleted
// Original line: 17

import { renderTextLayer } from 'pdfjs-dist/legacy/build/pdf';
import logger from 'kolibri-logging';

const logging = logger.getLogger(__filename);

const EXPAND_DIVS_TIMEOUT = 300; // ms

/**
 * @typedef {Object} TextLayerBuilderOptions
 * @property {HTMLDivElement} textLayerDiv - The text layer container.
 * @property {number} pageIndex - The page index.
 * @property {PageViewport} viewport - The viewport of the text layer.
 * @property {TextHighlighter} highlighter - Optional object that will handle
 *   highlighting text from the find controller.
 * @property {boolean} enhanceTextSelection - Option to turn on improved
 *   text selection.
 */

/**
 * The text layer builder provides text selection functionality for the PDF.
 * It does this by creating overlay divs over the PDF's text. These divs
 * contain text that matches the PDF text they are overlaying.
 */
class TextLayerBuilder {
  constructor({
    textLayerDiv,
    eventBus,
    pageIndex,
    viewport,
    highlighter = null,
    enhanceTextSelection = false,
  }) {
    this.textLayerDiv = textLayerDiv;
    this.eventBus = eventBus;
    this.textContent = null;
    this.textContentItemsStr = [];
    this.textContentStream = null;
    this.renderingDone = false;
    this.pageNumber = pageIndex + 1;
    this.viewport = viewport;
    this.textDivs = [];
    this.textLayerRenderTask = null;
    this.highlighter = highlighter;
    this.enhanceTextSelection = enhanceTextSelection;

    this._bindMouse();
  }

  /**
   * @private
   */
  _finishRendering() {
    this.renderingDone = true;

    if (!this.enhanceTextSelection) {
      const endOfContent = document.createElement('div');
      endOfContent.className = 'endOfContent';
      this.textLayerDiv.append(endOfContent);
    }

    // Modified: Validate eventBus is defined
    // Original line: 79
    if (this.eventBus) {
      this.eventBus.emit('textlayerrendered', {
        source: this,
        pageNumber: this.pageNumber,
        numTextDivs: this.textDivs.length,
      });
    }
  }

  /**
   * Renders the text layer.
   *
   * @param {number} [timeout] - Wait for a specified amount of milliseconds
   *                             before rendering.
   */
  render(timeout = 0) {
    if (!(this.textContent || this.textContentStream) || this.renderingDone) {
      return;
    }
    this.cancel();

    this.textDivs.length = 0;

    // Modified: Validate highlighter is defined instead of using optional chain operator
    // Original line: 99
    if (this.highlighter) {
      this.highlighter.setTextMapping(this.textDivs, this.textContentItemsStr);
    }

    const textLayerFrag = document.createDocumentFragment();
    this.textLayerRenderTask = renderTextLayer({
      textContent: this.textContent,
      textContentStream: this.textContentStream,
      container: textLayerFrag,
      viewport: this.viewport,
      textDivs: this.textDivs,
      textContentItemsStr: this.textContentItemsStr,
      timeout,
      enhanceTextSelection: this.enhanceTextSelection,
    });
    this.textLayerRenderTask.promise.then(
      () => {
        // Modified: Removing blank lines
        // Original line: 114
        const childsToRemove = [];
        for (let i = 0; i < textLayerFrag.children.length; i++) {
          const child = textLayerFrag.children[i];
          if (
            child.className.includes('markedContent') &&
            child.id !== undefined &&
            child.innerHTML === ''
          ) {
            childsToRemove.push(child);
          }
        }
        for (let i = 0; i < childsToRemove.length; i++) {
          textLayerFrag.removeChild(childsToRemove[i]);
        }
        this.textLayerDiv.append(textLayerFrag);
        this._finishRendering();
        // Modified: Validate highlighter is defined instead of using optional chain operator
        // Original line: 116
        if (this.highlighter) {
          this.highlighter.enable();
        }
      },
      // Modified: Logging errors
      // Original line: 118
      err => {
        logging.error('Error rendering text layer: ', err);
      },
    );
  }

  /**
   * Cancel rendering of the text layer.
   */
  cancel() {
    if (this.textLayerRenderTask) {
      this.textLayerRenderTask.cancel();
      this.textLayerRenderTask = null;
      // Modified: Removing content from text layer to avoid multiple layers rendering on zoom
      // Original line: 131
      this.textLayerDiv.textContent = '';
    }
    // Modified: Validate highlighter is defined instead of using optional chain operator
    // Original line: 132
    if (this.highlighter) {
      this.highlighter.disable();
    }
  }

  setTextContentStream(readableStream) {
    this.cancel();
    this.textContentStream = readableStream;
  }

  setTextContent(textContent) {
    this.cancel();
    this.textContent = textContent;
  }

  /**
   * Improves text selection by adding an additional div where the mouse was
   * clicked. This reduces flickering of the content if the mouse is slowly
   * dragged up or down.
   *
   * @private
   */
  _bindMouse() {
    const div = this.textLayerDiv;
    let expandDivsTimer = null;

    div.addEventListener('mousedown', evt => {
      if (this.enhanceTextSelection && this.textLayerRenderTask) {
        this.textLayerRenderTask.expandTextDivs(true);
        // Modified: Delete PDFJS Dev global variables references
        // Original line: 159
        if (expandDivsTimer) {
          clearTimeout(expandDivsTimer);
          expandDivsTimer = null;
        }
        return;
      }

      const end = div.querySelector('.endOfContent');
      if (!end) {
        return;
      }
      // Modified: Delete PDFJS Dev global variables references
      // Original line: 173

      // On non-Firefox browsers, the selection will feel better if the height
      // of the `endOfContent` div is adjusted to start at mouse click
      // location. This avoids flickering when the selection moves up.
      // However it does not work when selection is started on empty space.

      // Modified: Refactor simplified code for deleting PDFJS Dev global variables references
      // Original line: 178
      const adjustTop =
        evt.target !== div &&
        window.getComputedStyle(end).getPropertyValue('-moz-user-select') !== 'none';
      if (adjustTop) {
        const divBounds = div.getBoundingClientRect();
        const r = Math.max(0, (evt.pageY - divBounds.top) / divBounds.height);
        end.style.top = (r * 100).toFixed(2) + '%';
      }
      end.classList.add('active');
    });

    div.addEventListener('mouseup', () => {
      if (this.enhanceTextSelection && this.textLayerRenderTask) {
        // Modified: Delete PDFJS Dev global variables references
        // Original line: 197
        expandDivsTimer = setTimeout(() => {
          if (this.textLayerRenderTask) {
            this.textLayerRenderTask.expandTextDivs(false);
          }
          expandDivsTimer = null;
        }, EXPAND_DIVS_TIMEOUT);
        return;
      }

      const end = div.querySelector('.endOfContent');
      if (!end) {
        return;
      }
      // Modified: Delete PDFJS Dev global variables references
      // Original line: 214
      end.style.top = '';
      end.classList.remove('active');
    });
  }
}

// Modified: Exporting TextLayerBuilder as a default export
// Original line: 222
export default TextLayerBuilder;
