import { TeX } from 'mathjax-full/js/input/tex';
import { browserAdaptor } from 'mathjax-full/js/adaptors/browserAdaptor';
import { HTMLHandler } from 'mathjax-full/js/handlers/html/HTMLHandler';
import { STATE } from 'mathjax-full/js/core/MathItem';
import { SerializedMmlVisitor } from 'mathjax-full/js/core/MmlTree/SerializedMmlVisitor';
import { TextParser } from 'mathjax-full/js/input/tex/textmacros/TextParser';
import { TagsFactory } from 'mathjax-full/js/input/tex/Tags';
import { ColorModel } from 'mathjax-full/js/input/tex/color/ColorUtil';

import 'mathjax-full/js/input/tex/ams/AmsConfiguration';
import 'mathjax-full/js/input/tex/boldsymbol/BoldsymbolConfiguration';
import 'mathjax-full/js/input/tex/cancel/CancelConfiguration';
import 'mathjax-full/js/input/tex/color/ColorConfiguration';
import 'mathjax-full/js/input/tex/configmacros/ConfigMacrosConfiguration';
import 'mathjax-full/js/input/tex/enclose/EncloseConfiguration';
import 'mathjax-full/js/input/tex/gensymb/GensymbConfiguration';
import 'mathjax-full/js/input/tex/mathtools/MathtoolsConfiguration';
import 'mathjax-full/js/input/tex/mhchem/MhchemConfiguration';
import 'mathjax-full/js/input/tex/noerrors/NoErrorsConfiguration';
import 'mathjax-full/js/input/tex/noundefined/NoUndefinedConfiguration';
import 'mathjax-full/js/input/tex/textmacros/TextMacrosConfiguration';
import 'mathjax-full/js/input/tex/unicode/UnicodeConfiguration';

// Package imports and order follow @khanacademy/mathjax-renderer 3.2.0 dist/tex-input-config.js.
export const TEX_PACKAGES = [
  'base',
  'ams',
  'boldsymbol',
  'cancel',
  'color',
  'configmacros',
  'enclose',
  'gensymb',
  'mathtools',
  'mhchem',
  'noerrors',
  'noundefined',
  'textmacros',
  'unicode',
];

// @khanacademy/mathjax-renderer 3.2.0 dist/memory-leak-fix.js works around MathJax #3061.
const originalMml = TextParser.prototype.mml;
TextParser.prototype.mml = function () {
  this.configuration.clear();
  return originalMml.call(this);
};

const visitor = new SerializedMmlVisitor();
// Each TeX input registers a new MathtoolsTags class in MathJax's global TagsFactory.
const input = new TeX({ packages: TEX_PACKAGES, baseURL: '' });
const mathDocument = new HTMLHandler(browserAdaptor()).create('', { InputJax: input });

function resetTexState() {
  const parseOptions = input.parseOptions;
  parseOptions.tags = TagsFactory.create(parseOptions.options.tags);
  parseOptions.tags.configuration = parseOptions;
  parseOptions.packageData.set('color', { model: new ColorModel() });
}

export function createTexRenderer(scope = '') {
  resetTexState();
  return (tex, display) => {
    const root = mathDocument.convert(tex, { display, end: STATE.CONVERT });
    root.attributes.set('dir', 'ltr');
    const emptyScripts = [];
    root.walkTree(node => {
      if (node.isKind('none')) {
        emptyScripts.push(node);
      }
      const id = node.attributes?.getExplicit('id');
      const href = node.attributes?.getExplicit('href');
      if (id?.startsWith('mjx-eqn:')) {
        node.attributes.set('id', scope + id);
      }
      if (href?.startsWith('#mjx-eqn%3A')) {
        node.attributes.set('href', '#' + scope + href.slice(1));
      }
    });
    // DOMPurify's MathML allowlist lacks `none`; an empty `mrow` holds the script slot.
    for (const node of emptyScripts) {
      node.parent.replaceChild(node.factory.create('mrow'), node);
    }
    return visitor.visitTree(root);
  };
}
