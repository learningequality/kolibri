import { wrapMathInputMessages, wrapPerseusMessages } from '../translationUtils';

function mathInputMessages(translations) {
  const translator = { _defaultMessages: {} };
  for (const [key, message] of Object.entries(translations)) {
    translator._defaultMessages[key] = key;
    translator[`${key}$`] = () => message;
  }
  return wrapMathInputMessages(wrapPerseusMessages(translator));
}

describe('wrapMathInputMessages', () => {
  it.each([
    ['ar', { sin: 'جا', cos: 'جتا', tan: 'ظا' }, { sin: 'sin', cos: 'cos', tan: 'tan' }],
    ['pt', { sin: 'sen', cos: 'cos', tan: 'tg' }, { sin: 'sin', cos: 'cos', tan: 'tan' }],
    ['el', { sin: 'ημ', cos: 'συν', tan: 'εφ' }, { sin: 'sin', cos: 'cos', tan: 'tan' }],
  ])('in %s gives the function names math-input writes', (language, translations, names) => {
    const messages = mathInputMessages(translations);
    expect({ sin: messages.sin, cos: messages.cos, tan: messages.tan }).toEqual(names);
  });

  it('passes other messages through', () => {
    expect(mathInputMessages({ cos: 'جتا', cosine: 'جيب التمام' }).cosine).toBe('جيب التمام');
  });
});
