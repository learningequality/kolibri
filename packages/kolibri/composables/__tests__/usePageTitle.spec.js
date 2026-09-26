import { nextTick, ref } from 'vue';
import { render } from '@testing-library/vue';
import { error } from 'kolibri/utils/appError';
import { i18nReady } from 'kolibri/utils/i18n';
import usePageTitle from '../usePageTitle';

let mockIsRtl = false;

jest.mock('kolibri/utils/i18n', () => ({
  ...jest.requireActual('kolibri/utils/i18n'),
  isRtl: () => mockIsRtl,
}));

function titledPage(title) {
  return {
    setup() {
      usePageTitle(title);
    },
    template: '<div />',
  };
}

describe('usePageTitle', () => {
  beforeEach(() => {
    document.title = '';
    error.value = null;
    mockIsRtl = false;
  });

  it('follows a registered title as it changes, falling back to Kolibri when empty', async () => {
    const title = ref('Lessons');
    render(titledPage(title));
    await nextTick();
    expect(document.title).toBe('Lessons - Kolibri');

    title.value = 'Quizzes';
    await nextTick();
    expect(document.title).toBe('Quizzes - Kolibri');

    title.value = '';
    await nextTick();
    expect(document.title).toBe('Kolibri');
  });

  it('joins title parts, skipping empty ones', async () => {
    render(titledPage(['Lesson 1', '', 'Class A']));
    await nextTick();
    expect(document.title).toBe('Lesson 1 - Class A - Kolibri');
  });

  it('joins title parts right to left in RTL languages', async () => {
    mockIsRtl = true;
    render(titledPage(['Lesson 1', '', 'Class A']));
    await nextTick();
    expect(document.title).toBe('Class A - Lesson 1 - Kolibri');
  });

  it('uses the innermost registration, and the outer one once it unmounts', async () => {
    const showChild = ref(true);
    render({
      components: { Child: titledPage('New learner') },
      setup() {
        usePageTitle('Class A');
        return { showChild };
      },
      template: '<div><Child v-if="showChild" /></div>',
    });
    await nextTick();
    expect(document.title).toBe('New learner - Kolibri');

    showChild.value = false;
    await nextTick();
    await nextTick();
    expect(document.title).toBe('Class A - Kolibri');
  });

  it('falls back to Kolibri when the page that registered is replaced', async () => {
    const page = ref(titledPage('Lessons'));
    render({
      setup() {
        return { page };
      },
      template: '<component :is="page" />',
    });
    await nextTick();
    page.value = { template: '<div />' };
    await nextTick();
    await nextTick();
    expect(document.title).toBe('Kolibri');
  });

  it('shows the error title while an error is set', async () => {
    render(titledPage('Lessons'));
    await nextTick();
    error.value = 'boom';
    await nextTick();
    expect(document.title).toBe('Error - Kolibri');

    error.value = null;
    await nextTick();
    expect(document.title).toBe('Lessons - Kolibri');
  });

  it('can be imported before i18n is ready', () => {
    i18nReady.value = false;
    try {
      expect(() => {
        jest.isolateModules(() => {
          // eslint-disable-next-line global-require
          require('../usePageTitle');
        });
      }).not.toThrow();
    } finally {
      i18nReady.value = true;
    }
  });
});
