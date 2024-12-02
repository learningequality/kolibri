'use strict';
/**
 * For math rendered using KaTex and/or MathJax. Use me like <TeX>2x + 3</TeX>.
 * Vendored and tweaked from:
 * https://github.com/Khan/react-components/blob/fee9ceb0ff7dfe40370465101dd86f1def33a9d5/js/tex.jsx
 */
/* global MathJax */

import * as PureRenderMixin from 'react-addons-pure-render-mixin';
import { createElement } from 'react';
import { findDOMNode } from 'react-dom';
import PropTypes from 'prop-types';
import katex from 'katex';
import katexA11y from 'katex/dist/contrib/render-a11y-string';
import createReactClass from 'create-react-class';
import scriptLoader from 'kolibri/utils/scriptLoader';
import urls from 'kolibri/urls';

let pendingScripts = [];
let pendingCallbacks = [];
let needsProcess = false;

// For creating unique element ids required by the aria-describedby attribute
let describedByIdCounter = 0;

const process = (script, callback) => {
  pendingScripts.push(script);
  pendingCallbacks.push(callback);
  if (!needsProcess) {
    needsProcess = true;
    setTimeout(doProcess, 0);
  }
};

const unProcess = script => {
  const scriptIndex = pendingScripts.indexOf(script);
  pendingScripts.splice(scriptIndex, 1);
  pendingCallbacks.splice(scriptIndex, 1);
};

// because MathJax isn't compatible with webpack, we are loading it this way.
const mathJaxConfigFileName = require('../constants').ConfigFileName;
// the config is fragile, Khan may change it and we need to update the following hardcoded path.
const mathJaxUrl = urls.static(`mathjax/2.1/MathJax.js?config=${mathJaxConfigFileName}`);

const loadMathJax = callback => {
  if (typeof MathJax !== 'undefined') {
    callback();
  } else {
    const mathJaxPromise = scriptLoader(mathJaxUrl);
    mathJaxPromise.then(callback);
  }
};

const doProcess = () => {
  loadMathJax(() => {
    MathJax.Hub.Queue(function () {
      const oldElementScripts = MathJax.Hub.elementScripts;
      MathJax.Hub.elementScripts = () => pendingScripts;

      try {
        return MathJax.Hub.Process(null, () => {
          // Trigger all of the pending callbacks before clearing them
          // out.
          for (const callback of pendingCallbacks) {
            callback();
          }

          pendingScripts = [];
          pendingCallbacks = [];
          needsProcess = false;
        });
      } finally {
        MathJax.Hub.elementScripts = oldElementScripts;
      }
    });
  });
};

// Make content only visible to screen readers.
// Both collegeboard.org and Bootstrap 3 use this exact implementation.
const srOnly = {
  border: 0,
  clip: 'rect(0,0,0,0)',
  height: '1px',
  margin: '-1px',
  overflow: 'hidden',
  padding: 0,
  position: 'absolute',
  width: '1px',
};

const TeX = createReactClass({
  propTypes: {
    children: PropTypes.node,
    katexOptions: PropTypes.any,
    onClick: PropTypes.func,
    onRender: PropTypes.func,
    style: PropTypes.any,
  },

  mixins: [PureRenderMixin],

  getDefaultProps: function () {
    return {
      katexOptions: {
        // There was a breaking change in the behavior of \color{}
        // in KaTeX 0.8.0. KA content relies on the old behavior
        // so we set this option to retain that old behavior even
        // though it is not purely compatible with LaTeX.
        // See https://github.com/Khan/KaTeX/blob/master/README.md
        // for details on this option.
        colorIsTextColor: true,
      },
      // Called after math is rendered or re-rendered
      onRender: function () {},
      onClick: null,
    };
  },

  // TODO(joshuan): Once we are using React 16.3+,
  // migrate to getDerivedStateFromProps
  getInitialState: function () {
    return {
      mounted: false,
      katexHtml: this.getKatexHtml(this.props),
    };
  },

  componentDidMount: function () {
    this._root = findDOMNode(this);

    this.setState({
      mounted: true,
    });

    if (this.refs.katex.childElementCount > 0) {
      // If we already rendered katex in the render function, we don't
      // need to render anything here.
      this.props.onRender(this._root);
      return;
    }

    const text = this.props.children;

    this.setScriptText(text);
    this.process(() => this.props.onRender(this._root));
  },

  // TODO(joshuan): If you are updating to React 16.3+, migrate to
  // getDerivedStateFromProps
  componentWillReceiveProps: function (nextProps) {
    if (
      nextProps.children !== this.props.children ||
      JSON.stringify(nextProps.katexOptions) !== JSON.stringify(this.props.katexOptions)
    ) {
      this.setState({
        katexHtml: this.getKatexHtml(nextProps),
      });
    }
  },

  componentDidUpdate: function (prevProps) {
    if (this.props.children !== prevProps.children) {
      this.maybeUnprocess();

      // If we already rendered katex in the render function, we don't
      // need to render anything here.
      if (this.refs.katex.childElementCount > 0) {
        if (this.script) {
          // If we successfully rendered KaTeX, check if there's
          // lingering MathJax from the last render, and if so remove it.
          loadMathJax(() => {
            const jax = MathJax.Hub.getJaxFor(this.script);
            if (jax) {
              jax.Remove();
            }
          });
        }

        this.props.onRender();
        return;
      }

      const newText = this.props.children;

      if (this.script) {
        loadMathJax(() => {
          MathJax.Hub.Queue(() => {
            const jax = MathJax.Hub.getJaxFor(this.script);
            if (jax) {
              return jax.Text(newText, this.props.onRender);
            } else {
              this.setScriptText(newText);
              this.process(this.props.onRender);
            }
          });
        });
      } else {
        this.setScriptText(newText);
        this.process(this.props.onRender);
      }
    }
  },

  componentWillUnmount: function () {
    this.maybeUnprocess();

    if (this.script) {
      loadMathJax(() => {
        const jax = MathJax.Hub.getJaxFor(this.script);
        if (jax) {
          jax.Remove();
        }
      });
    }
  },

  getKatexHtml(props) {
    // Try to render the math content with KaTeX.
    // If this fails, componentDidUpdate() will notice and
    // use MathJAX instead.
    try {
      return {
        __html: katex.renderToString(props.children, props.katexOptions),
      };
    } catch (e) {
      // By catching the exception here and returning null
      // we will fall back to asyncronously rendering with
      // MathJAX.
      //
      // NOTE: formerly we only returned null if the error
      // was a parse error from Katex and re-threw any other errors.
      // But https://khanacademy.atlassian.net/browse/CP-879 and
      // https://khanacademy.atlassian.net/browse/CP-1742 were caused
      // by regular TypeError exceptions in Katex, so we might as
      // well fall back to MathJAX in that case as well. (The Katex
      // bug is fixed in the latest version and will stop happening
      // when we upgrade webapp to use Katex 1.0.)
      //
      // TODO: We could use Raven.captureMessage() to send a message
      // to Sentry when these errors occur if we want to get serious
      // about eliminating them. Such a message should include
      // window.location, props.children (the string of katex source)
      // and the error itself.
      return null;
    }
  },

  process: function (callback) {
    this.hasProcessed = false;
    process(this.script, () => {
      this.hasProcessed = true;
      callback && callback();
    });
  },

  maybeUnprocess: function () {
    // Sometimes, we end up rendering this component with some MathJax-only
    // math before very quickly switching over to some other math, before
    // MathJax has had a time to render. We want to remove the previously
    // queued render so that we don't accidentally render some math that we
    // don't want displayed.
    if (this.script && !this.hasProcessed) {
      unProcess(this.script);
    }
  },

  setScriptText: function (text) {
    if (!this.script) {
      this.script = document.createElement('script');
      this.script.type = 'math/tex';
      findDOMNode(this.refs.mathjax).appendChild(this.script);
    }
    if ('text' in this.script) {
      // IE8, etc
      this.script.text = text;
    } else {
      this.script.textContent = text;
    }
  },

  render: function () {
    const { katexHtml } = this.state;

    // If we successfully parsed with KaTeX, then try parse the
    // same math text to an english rendering that can be read
    // by screen readers. Our katexA11y module is out of date and
    // not well maintained, so it can not always transform math
    // into readable english. We ignore any exceptions it throws.
    let katexA11yHtml = null;
    let describedById = null;
    if (katexHtml) {
      try {
        katexA11yHtml = {
          __html: katexA11y.renderString(this.props.children),
        };
        // The server and the client will not necessarily use the same
        // ID, and the initial client markup must match the server
        // markup. Thus, we only add an ID once we've rendered once.
        if (this.state.mounted) {
          describedById = `katex-${++describedByIdCounter}`;
        }
      } catch (e) {
        // Nothing
      }
    }

    return createElement(
      'span',
      {
        style: this.props.style,
        onClick: this.props.onClick,
      },
      createElement('span', {
        ref: 'mathjax',
      }),
      createElement('span', {
        ref: 'katex',
        dangerouslySetInnerHTML: katexHtml,
        'aria-hidden': !!katexA11yHtml,
        'aria-describedby': describedById,
      }),
      createElement('span', {
        dangerouslySetInnerHTML: katexA11yHtml,
        id: describedById,
        style: srOnly,
      }),
    );
  },
});

export default TeX;
