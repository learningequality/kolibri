import { h, nextTick } from 'vue';
import { render, screen } from '@testing-library/vue';
import useKeypad from '../../../composables/useKeypad';
import numericKeypadStrings from '../../../strings/numericKeypadStrings';
import NumericKeypad from '../index.vue';

const { decimal$ } = numericKeypadStrings;

const ARABIC_INDIC_THREE = '٣';

async function renderKeypad(langId) {
  let keypadAPI;
  const Host = {
    setup() {
      ({ keypadAPI } = useKeypad());
      return () => h(NumericKeypad, { props: { lang: { id: langId } } });
    },
  };
  render(Host);
  keypadAPI.activate();
  await nextTick();
}

describe('NumericKeypad', () => {
  it.each([
    ['en', '.'],
    ['hi', '.'],
    ['fr', ','],
  ])('labels the decimal key for %s with %s', async (langId, separator) => {
    await renderKeypad(langId);
    expect(screen.getByRole('button', { name: decimal$() })).toHaveTextContent(separator);
  });

  it('labels digits and decimal for ar-EG in Arabic-Indic glyphs', async () => {
    await renderKeypad('ar-EG');
    expect(screen.getByRole('button', { name: ARABIC_INDIC_THREE })).toBeVisible();
    expect(screen.getByRole('button', { name: decimal$() })).toHaveTextContent('٫');
  });
});
