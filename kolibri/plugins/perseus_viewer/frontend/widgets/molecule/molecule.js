// Copyright 2022 Khan Academy
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
// Software, and to permit persons to whom the Software is furnished to do so, subject
// to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
// FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
// COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN
// AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// Vendored from Khan/perseus @khanacademy/perseus@78.2.0,
// packages/perseus/src/widgets/molecule/molecule.tsx

import { Component, createElement as e, createRef } from 'react';
import { PerseusI18nContext } from '@khanacademy/perseus';

import draw from './moleculeDrawing';
import MoleculeLayout from './moleculeLayout';
import SmilesParser from './smilesParser';

const { layout } = MoleculeLayout;
const parse = SmilesParser.parse;
const ParseError = SmilesParser.ParseError;

const borderSize = 30;

class Molecule extends Component {
  static contextType = PerseusI18nContext;

  static defaultProps = {
    rotationAngle: 0,
  };

  state = { parsedSmiles: null, error: null };

  canvas = createRef();

  UNSAFE_componentWillMount() {
    this.stateFromSmiles(this.props.smiles);
  }

  componentDidMount() {
    this.canvasRender();
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    this.stateFromSmiles(nextProps.smiles);
  }

  componentDidUpdate() {
    this.canvasRender();
  }

  stateFromSmiles = smiles => {
    try {
      this.setState({
        parsedSmiles: parse(smiles),
        error: null,
      });
    } catch (e) {
      if (e instanceof ParseError) {
        this.setState({ error: e.message });
      } else {
        throw e;
      }
    }
  };

  setCanvasBounds = (canvas, items) => {
    const xmax = Math.max(...items.map(item => (item.pos ? item.pos[0] : -Infinity)));
    const ymax = Math.max(...items.map(item => (item.pos ? item.pos[1] : -Infinity)));
    const xmin = Math.min(...items.map(item => (item.pos ? item.pos[0] : Infinity)));
    const ymin = Math.min(...items.map(item => (item.pos ? item.pos[1] : Infinity)));
    const width = xmax - xmin + 2 * borderSize;
    const height = ymax - ymin + 2 * borderSize;
    canvas.width = width;
    canvas.height = height;
    return [borderSize - xmin, borderSize - ymin];
  };

  canvasRender = () => {
    // Since canvas drawing happens only through an imperative API, we sync
    // up the component with the canvas here, which happens when the
    // component mounts or updates.
    if (!!this.state.error || !this.state.parsedSmiles) {
      return;
    }
    const items = layout(this.state.parsedSmiles, this.props.rotationAngle);
    const canvas = this.canvas.current;
    const translation = this.setCanvasBounds(canvas, items);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(translation[0], translation[1]);
    draw(ctx, items);
    ctx.restore();
  };

  render() {
    const description = this.context.strings.molecularDrawing({
      content: this.props.smiles || '',
    });
    let content = e(
      'canvas',
      {
        className: 'molecule-canvas',
        id: this.props.widgetId + '-molecule',
        ref: this.canvas,
        role: 'img',
        'aria-label': description,
      },
      description,
    );
    if (this.state.error) {
      content = e('div', { className: 'error' }, this.state.error);
    }
    return e('div', { className: 'molecule-canvas' }, content);
  }
}

export default class MoleculeWidget extends Component {
  render() {
    return e(Molecule, {
      widgetId: this.props.widgetId,
      smiles: this.props.options.smiles,
      rotationAngle: this.props.options.rotationAngle,
    });
  }
}
