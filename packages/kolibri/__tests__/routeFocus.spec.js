import { nextTick, onMounted, onUnmounted } from 'vue';
import { render, screen } from '@testing-library/vue';
import usePageTitle from 'kolibri/composables/usePageTitle';
import AppBarPage from 'kolibri/components/pages/AppBarPage';
import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
import router from '../router';

const PAGE_TITLE = 'Page title';
const VISIBLE_HEADING = 'Visible heading';
const OPENER = 'Opener';
const PANEL_INPUT = 'Panel input';
const FIELD = 'Field';
const LINK = 'Link';

// Route components are compiled without templates in Jest, so they use render functions.
function page({ shell = ImmersivePage, title, options, content = () => [] } = {}) {
  return {
    name: 'TestPage',
    setup() {
      if (title) {
        usePageTitle(title, options);
      }
    },
    render(h) {
      return h(shell, [h('button', OPENER), ...content(h), h('router-view')]);
    },
  };
}

// Mirrors kolibri-common's SidePanelModal focus timing, which this package can't import.
const Panel = {
  name: 'TestPanel',
  setup() {
    const lastFocus = document.activeElement;
    onMounted(() => nextTick(() => screen.getByRole('textbox', { name: PANEL_INPUT }).focus()));
    onUnmounted(() => setTimeout(() => lastFocus.focus()));
  },
  render(h) {
    return h('div', { attrs: { role: 'dialog' } }, [
      h('input', { attrs: { 'aria-label': PANEL_INPUT } }),
      h('router-view'),
    ]);
  },
};

const Empty = { name: 'Empty', render: h => h('div') };

// Focuses on insert, as KDS's `v-autofocus` does.
const AutofocusField = {
  name: 'AutofocusField',
  mounted() {
    this.$el.focus();
  },
  render: h => h('input', { attrs: { 'aria-label': FIELD } }),
};

const routes = [
  {
    name: 'PAGE',
    path: '/page',
    component: page({
      title: PAGE_TITLE,
      content: h => [h('router-link', { props: { to: '/visible' } }, LINK)],
    }),
  },
  {
    name: 'VISIBLE',
    path: '/visible',
    component: page({
      title: PAGE_TITLE,
      options: { hasVisibleHeading: true },
      content: h => [h('h1', VISIBLE_HEADING)],
    }),
  },
  {
    name: 'UNTITLED',
    path: '/untitled',
    component: page({ content: h => [h('h1', VISIBLE_HEADING)] }),
  },
  {
    name: 'HOST',
    path: '/host',
    component: page({ title: PAGE_TITLE }),
    children: [
      {
        name: 'PANEL',
        path: 'panel',
        component: Panel,
        meta: { panel: true },
        children: [{ name: 'DEEPER', path: 'deeper', component: Empty }],
      },
    ],
  },
  {
    name: 'TABBED',
    path: '/tabbed',
    component: page({ title: PAGE_TITLE }),
    redirect: '/tabbed/tab',
    children: [
      { name: 'TAB', path: 'tab', component: Empty },
      { name: 'TAB_PANEL', path: 'panel', component: Panel, meta: { panel: true } },
    ],
  },
  {
    name: 'COURSE',
    path: '/course',
    component: page({ title: PAGE_TITLE }),
    children: [
      { name: 'TAB_ONE', path: 'one', component: Empty, meta: { keepFocus: true } },
      { name: 'TAB_TWO', path: 'two', component: Empty, meta: { keepFocus: true } },
    ],
  },
  // AppBarPage routes navigate within one shell instance: in jsdom, a newly mounted SideNav
  // focuses its hidden first menu item, which a browser refuses.
  { name: 'TOPIC', path: '/topic/:id', component: page({ shell: AppBarPage, title: PAGE_TITLE }) },
  {
    name: 'PARENT',
    path: '/parent',
    component: page({ shell: AppBarPage, title: PAGE_TITLE }),
    children: [{ name: 'STEP', path: 'step', component: Empty }],
  },
  {
    name: 'QUESTION',
    path: '/question/:n',
    component: page({ shell: AppBarPage, title: PAGE_TITLE }),
    meta: { keepFocus: true },
  },
  {
    name: 'REDIRECTING',
    path: '/redirecting',
    component: {
      name: 'Redirecting',
      created() {
        this.$router.replace('/page');
      },
      render: h => h('div'),
    },
  },
  {
    name: 'AUTOFOCUS',
    path: '/autofocus',
    component: page({
      title: PAGE_TITLE,
      content: h => [h(AutofocusField)],
    }),
  },
];

let vueRouter;

const App = { name: 'App', render: h => h('router-view') };

function settle() {
  return new Promise(resolve => setTimeout(resolve));
}

async function renderAt(path) {
  window.location.hash = `#${path}`;
  render(App, { router: vueRouter });
  await settle();
}

// The keypress that triggers a navigation is the user's first input after page load.
async function navigate(location) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  await vueRouter.push(location);
  await settle();
}

async function focusTargetsDuring(action) {
  const targets = [];
  const onFocusIn = event => targets.push(event.target);
  document.addEventListener('focusin', onFocusIn);
  await action();
  document.removeEventListener('focusin', onFocusIn);
  return targets;
}

function opener() {
  return screen.getByRole('button', { name: OPENER });
}

function pageHeading() {
  return screen.getByRole('heading', { level: 1 });
}

describe('focus after a route change', () => {
  beforeAll(() => {
    vueRouter = router.initRoutes(routes);
  });

  // These run first: page load ends at the user's first input.
  it('leaves focus alone when a page redirects during page load', async () => {
    await renderAt('/redirecting');
    expect(vueRouter.currentRoute.path).toBe('/page');
    expect(document.body).toHaveFocus();
  });

  // A screen reader in browse mode activates a link with a click and no keydown.
  it('focuses the heading after a navigation by click alone', async () => {
    await renderAt('/page');
    screen.getByRole('link', { name: LINK }).click();
    await settle();
    expect(pageHeading()).toHaveTextContent(VISIBLE_HEADING);
    expect(pageHeading()).toHaveFocus();
  });

  it.each([
    ['ImmersivePage', '/topic/a', '/page'],
    ['AppBarPage', '/topic/a', '/topic/b'],
    ['AppBarPage nested route', '/parent', '/parent/step'],
  ])("focuses the %s's hidden heading", async (_, from, to) => {
    await renderAt(from);
    opener().focus();
    await navigate(to);
    expect(pageHeading()).toHaveTextContent(PAGE_TITLE);
    expect(pageHeading()).toHaveFocus();
  });

  it("focuses an opted-out page's own heading", async () => {
    await renderAt('/page');
    opener().focus();
    await navigate('/visible');
    expect(pageHeading()).toHaveTextContent(VISIBLE_HEADING);
    expect(pageHeading()).toHaveFocus();
  });

  describe('with a panel opened from its host', () => {
    let headingFocused;
    function onFocusIn(event) {
      headingFocused = headingFocused || event.target.tagName === 'H1';
    }

    beforeEach(async () => {
      await renderAt('/host');
      opener().focus();
      headingFocused = false;
      document.addEventListener('focusin', onFocusIn);
      await navigate('/host/panel');
    });

    afterEach(() => {
      document.removeEventListener('focusin', onFocusIn);
    });

    function panel() {
      return screen.getByRole('dialog');
    }

    it('keeps focus in the panel', () => {
      expect(panel()).toContainElement(document.activeElement);
      expect(headingFocused).toBe(false);
    });

    it('keeps focus in the panel when moving deeper into it', async () => {
      await navigate('/host/panel/deeper');
      expect(panel()).toContainElement(document.activeElement);
      expect(headingFocused).toBe(false);
    });

    it('keeps the focus the panel returns to its opener when it closes', async () => {
      await navigate('/host');
      expect(opener()).toHaveFocus();
      expect(headingFocused).toBe(false);
    });

    it('focuses the heading of another page the panel navigates to', async () => {
      await navigate('/page');
      expect(pageHeading()).toHaveFocus();
    });
  });

  it('keeps the focus a panel returns to its opener when its close redirects', async () => {
    await renderAt('/tabbed/tab');
    opener().focus();
    await navigate('/tabbed/panel');
    const focused = await focusTargetsDuring(() => navigate('/tabbed'));
    expect(opener()).toHaveFocus();
    expect(focused).not.toContain(pageHeading());
  });

  it('focuses the heading when a panel closes without an opener on the page', async () => {
    await renderAt('/host/panel');
    await navigate('/host');
    expect(pageHeading()).toHaveFocus();
  });

  it('keeps focus when switching between keepFocus sibling routes', async () => {
    await renderAt('/course/one');
    opener().focus();
    await navigate('/course/two');
    expect(opener()).toHaveFocus();
  });

  it('keeps focus when only the query changes', async () => {
    await renderAt('/page');
    opener().focus();
    await navigate({ path: '/page', query: { filter: 'on' } });
    expect(opener()).toHaveFocus();
  });

  it('keeps focus when a keepFocus route changes only its params', async () => {
    await renderAt('/question/1');
    opener().focus();
    await navigate('/question/2');
    expect(opener()).toHaveFocus();
  });

  // Checked through focusin: the newly mounted SideNav then takes focus in jsdom.
  it('focuses the heading when arriving at a keepFocus route from another page', async () => {
    await renderAt('/page');
    opener().focus();
    const focused = await focusTargetsDuring(() => navigate('/question/1'));
    expect(focused).toContain(pageHeading());
  });

  it('keeps the focus a page gives its autofocused field', async () => {
    await renderAt('/topic/a');
    opener().focus();
    await navigate('/autofocus');
    expect(screen.getByRole('textbox', { name: FIELD })).toHaveFocus();
  });

  it('leaves focus alone on a page with no registered title', async () => {
    await renderAt('/page');
    opener().focus();
    await navigate('/untitled');
    expect(document.body).toHaveFocus();
  });
});
