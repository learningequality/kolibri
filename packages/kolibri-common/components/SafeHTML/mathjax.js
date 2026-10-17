import { mathjax } from 'mathjax-full/js/mathjax';
import { MathML } from 'mathjax-full/js/input/mathml';
import { CHTML } from 'mathjax-full/js/output/chtml';
import { browserAdaptor } from 'mathjax-full/js/adaptors/browserAdaptor';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html';
import urls from 'kolibri/urls';

const STYLESHEET_ID = 'safe-html-mjx-chtml-styles';

RegisterHTMLHandler(browserAdaptor());

const outputJax = new CHTML({ fontURL: urls.static('assets/mathjax/fonts') });
// Native MathML renders an element with the wrong number of children as-is;
// MathJax's arity check would replace it with an error showing the tag name.
const mathDocument = mathjax.document('', {
  InputJax: new MathML({ verify: { checkArity: false } }),
  OutputJax: outputJax,
});

export function renderMathML(mml, display) {
  const element = mathDocument.convert(mml, { display });
  // A misplaced <mtd>, <mtr> or <mprescripts> becomes an error showing its tag
  // name whatever `verify` says; native MathML shows its content instead.
  const error = element.querySelector('[data-mjx-message]');
  if (error) {
    throw new Error(error.getAttribute('data-mjx-message'));
  }
  // The Perseus viewer's MathJax instance appends its sheet only if no element
  // has MathJax's default sheet id, so this sheet needs its own id.
  // `parentNode`, not `isConnected`, which Chrome < 54 lacks.
  const styleSheet = outputJax.styleSheet(mathDocument);
  if (!styleSheet.parentNode) {
    styleSheet.id = STYLESHEET_ID;
    document.head.appendChild(styleSheet);
  }
  return element;
}
