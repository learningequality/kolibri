import { nextTick, onErrorCaptured, ref } from 'vue';
import { render } from '@testing-library/vue';
import { error } from 'kolibri/utils/appError';
import { i18nReady } from 'kolibri/utils/i18n';
import usePageTitle from '../usePageTitle';
import metaInfoTracker from '../internal/metaInfoTracker';

let mockIsRtl = false;

jest.mock('kolibri/utils/i18n', () => ({
  ...jest.requireActual('kolibri/utils/i18n'),
  isRtl: () => mockIsRtl,
}));

function tabTitle(...parts) {
  return [...parts, 'Kolibri'].join(' - ');
}

// Collects errors thrown by descendants, instead of failing the test.
function captureErrors(errors) {
  onErrorCaptured(err => {
    errors.push(err);
    return false;
  });
}

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
    expect(document.title).toBe(tabTitle('Lessons'));

    title.value = 'Quizzes';
    await nextTick();
    expect(document.title).toBe(tabTitle('Quizzes'));

    title.value = '';
    await nextTick();
    expect(document.title).toBe(tabTitle());
  });

  it('joins title parts, skipping empty ones', async () => {
    render(titledPage(['Lesson 1', '', 'Class A']));
    await nextTick();
    expect(document.title).toBe(tabTitle('Lesson 1', 'Class A'));
  });

  it('keeps logical order in RTL languages, marking the title and separators right to left', async () => {
    mockIsRtl = true;
    render(titledPage(['Lesson 1', '', 'Class A']));
    await nextTick();
    expect(document.title).toBe('\u200FLesson 1\u200F - \u200FClass A\u200F - \u200FKolibri');
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
    expect(document.title).toBe(tabTitle('New learner'));

    showChild.value = false;
    await nextTick();
    await nextTick();
    expect(document.title).toBe(tabTitle('Class A'));
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
    expect(document.title).toBe(tabTitle());
  });

  it('throws when a registration is neither an ancestor nor a descendant of another', async () => {
    const showUncle = ref(false);
    const errors = [];
    render({
      components: {
        Uncle: titledPage('Uncle'),
        Parent: {
          components: { Nephew: titledPage('Nephew') },
          template: '<div><Nephew /></div>',
        },
      },
      setup() {
        usePageTitle('Grandparent');
        captureErrors(errors);
        return { showUncle };
      },
      template: '<div><Parent /><Uncle v-if="showUncle" /></div>',
    });
    await nextTick();
    expect(errors).toHaveLength(0);

    showUncle.value = true;
    await nextTick();
    await nextTick();
    expect(errors).toHaveLength(1);
  });

  it('allows a registering page to replace another', async () => {
    const page = ref(titledPage('Lessons'));
    const errors = [];
    render({
      setup() {
        captureErrors(errors);
        return { page };
      },
      template: '<component :is="page" />',
    });
    await nextTick();
    page.value = titledPage('Quizzes');
    await nextTick();
    await nextTick();
    expect(errors).toHaveLength(0);
    expect(document.title).toBe(tabTitle('Quizzes'));
  });

  it('allows a registration to move between sibling subtrees in one update', async () => {
    const flag = ref(false);
    const errors = [];
    const panel = (show, title) => ({
      components: { Page: titledPage(title) },
      setup() {
        return { flag };
      },
      template: `<div><Page v-if="${show}" /></div>`,
    });
    render({
      components: { First: panel('flag', 'First'), Second: panel('!flag', 'Second') },
      setup() {
        captureErrors(errors);
      },
      template: '<div><First /><Second /></div>',
    });
    await nextTick();
    flag.value = true;
    await nextTick();
    await nextTick();
    expect(errors).toHaveLength(0);
    expect(document.title).toBe(tabTitle('First'));
  });

  it('shows the error title while an error is set', async () => {
    render(titledPage('Lessons'));
    await nextTick();
    error.value = 'boom';
    await nextTick();
    expect(document.title).toBe(tabTitle('Error'));

    error.value = null;
    await nextTick();
    expect(document.title).toBe(tabTitle('Lessons'));
  });

  it('keeps the title of a page that renders its own error state', async () => {
    render({
      setup() {
        usePageTitle('Setup', { hasOwnErrorPage: true });
      },
      template: '<div />',
    });
    await nextTick();
    error.value = 'boom';
    await nextTick();
    expect(document.title).toBe(tabTitle('Setup'));
  });

  it('leaves the title to vue-meta while a metaInfo component is mounted', async () => {
    const title = ref('Lessons');
    const showLegacy = ref(true);
    render({
      components: {
        Legacy: { mixins: [metaInfoTracker], metaInfo: { title: 'Legacy' }, template: '<div />' },
        Page: titledPage(title),
      },
      setup() {
        return { showLegacy };
      },
      template: '<div><Legacy v-if="showLegacy" /><Page /></div>',
    });
    await nextTick();
    document.title = 'Legacy';
    title.value = 'Quizzes';
    await nextTick();
    expect(document.title).toBe('Legacy');

    showLegacy.value = false;
    await nextTick();
    await nextTick();
    expect(document.title).toBe(tabTitle('Quizzes'));
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
