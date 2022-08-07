/* Copyright 2021 Mozilla Foundation
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
 * https://github.com/mozilla/pdf.js/blob/v2.14.305/web/struct_tree_layer_builder.js
 */

// Modified: typedef imports deleted
// Original line: 16

const PDF_ROLE_TO_HTML_ROLE = {
  // Document level structure types
  Document: null, // There's a "document" role, but it doesn't make sense here.
  DocumentFragment: null,
  // Grouping level structure types
  Part: 'group',
  Sect: 'group', // XXX: There's a "section" role, but it's abstract.
  Div: 'group',
  Aside: 'note',
  NonStruct: 'none',
  // Block level structure types
  P: null,
  // H<n>,
  H: 'heading',
  Title: null,
  FENote: 'note',
  // Sub-block level structure type
  Sub: 'group',
  // General inline level structure types
  Lbl: null,
  Span: null,
  Em: null,
  Strong: null,
  Link: 'link',
  Annot: 'note',
  Form: 'form',
  // Ruby and Warichu structure types
  Ruby: null,
  RB: null,
  RT: null,
  RP: null,
  Warichu: null,
  WT: null,
  WP: null,
  // List standard structure types
  L: 'list',
  LI: 'listitem',
  LBody: null,
  // Table standard structure types
  Table: 'table',
  TR: 'row',
  TH: 'columnheader',
  TD: 'cell',
  THead: 'columnheader',
  TBody: null,
  TFoot: null,
  // Standard structure type Caption
  Caption: null,
  // Standard structure type Figure
  Figure: 'img',
  // Standard structure type Formula
  Formula: null,
  // standard structure type Artifact
  Artifact: null,
};

const HEADING_PATTERN = /^H(\d+)$/;

// Modified: unused "options" props deleted and constructor definition deleted
//           Making use of the textLayer ref for taking into account just non-blank text
// Original line: 85

class StructTreeLayerBuilder {
  constructor(textLayer) {
    this.textLayer = textLayer;
  }
  render(structTree) {
    // Modified: Extracting ids of available nodes in textLayer
    // Original line: 90
    const availableNodes = [];
    for (let i = 0; i < this.textLayer.children.length; i++) {
      const node = this.textLayer.children[i];
      if (node.id !== undefined) {
        availableNodes.push(node.id);
      }
    }
    this.availableNodes = availableNodes;
    return this._walk(structTree);
  }

  _setAttributes(structElement, htmlElement) {
    if (structElement.alt !== undefined) {
      htmlElement.setAttribute('aria-label', structElement.alt);
    }
    if (structElement.id !== undefined) {
      htmlElement.setAttribute('aria-owns', structElement.id);
    }
    if (structElement.lang !== undefined) {
      htmlElement.setAttribute('lang', structElement.lang);
    }
  }

  _isNodeNotAvailable(node) {
    return (
      node.id !== undefined && node.id.startsWith('page') && !this.availableNodes.includes(node.id)
    );
  }

  _walk(node) {
    // Modified: Just take into account non-blank text
    // Original line: 106
    if (!node || this._isNodeNotAvailable(node)) {
      return null;
    }
    const element = document.createElement('span');
    if ('role' in node) {
      const { role } = node;
      const match = role.match(HEADING_PATTERN);
      if (match) {
        element.setAttribute('role', 'heading');
        element.setAttribute('aria-level', match[1]);
      } else if (PDF_ROLE_TO_HTML_ROLE[role]) {
        element.setAttribute('role', PDF_ROLE_TO_HTML_ROLE[role]);
      }
    }

    this._setAttributes(node, element);

    if (node.children) {
      if (node.children.length === 1 && 'id' in node.children[0]) {
        // Often there is only one content node so just set the values on the
        // parent node to avoid creating an extra span.
        if (!this._isNodeNotAvailable(node.children[0])) {
          this._setAttributes(node.children[0], element);
        }
      } else {
        for (const kid of node.children) {
          const node = this._walk(kid);
          // Modified: Validate that the node is not null
          // Original line: 131
          if (node) {
            element.appendChild(node);
          }
        }
      }
    }
    // Modified: Just take into account non-blank elements
    // Original line: 135
    if (
      element.innerHTML === '' &&
      element.getAttribute('aria-owns') == undefined &&
      element.getAttribute('role') == undefined
    ) {
      return null;
    }
    return element;
  }
}

// Modified: Exporting TextLayerBuilder as a default export
// Original line: 139
export default StructTreeLayerBuilder;
