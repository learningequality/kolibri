import fs from 'node:fs';
import path from 'node:path';

const kolibriRequire = name =>
  require(require.resolve(name, { paths: [require.resolve('kolibri/router')] }));
const Vue = kolibriRequire('vue');
const VueRouter = kolibriRequire('vue-router');

const SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../src/kolibri_app/scripts/restore.js'),
  'utf8',
);
const SAVED = '/en/facility/?token=x#/data/import';

function runRestoreScript({ origin = window.location.origin, saved = SAVED, token = 'a' } = {}) {
  const script = SOURCE.replace('__ORIGIN__', JSON.stringify(origin))
    .replace('__TOKEN__', JSON.stringify(token))
    .replace('__LOCATION__', JSON.stringify(saved));
  window.eval(script);
}

function loadPage(url) {
  window.history.replaceState(null, '', url);
}

describe('restore.js', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('keeps the restored page when the first route is slow', async () => {
    loadPage('/en/facility/?token=x');
    runRestoreScript();

    let releaseFirstRoute;
    const firstRouteHeld = new Promise(resolve => {
      releaseFirstRoute = resolve;
    });
    const vueRouter = new VueRouter({
      routes: [
        { path: '/', redirect: '/classes' },
        { path: '/classes' },
        { path: '/data/import' },
      ],
    });
    vueRouter.beforeEach(async (to, from, next) => {
      await firstRouteHeld;
      next();
    });
    const app = new Vue({ router: vueRouter, render: h => h('div') });
    releaseFirstRoute();
    await new Promise(resolve => vueRouter.onReady(resolve));

    expect(vueRouter.currentRoute.path).toBe('/data/import');
    expect(window.location.hash).toBe('#/data/import');
    app.$destroy();
  });

  it('restores over a route the page already set', () => {
    loadPage('/en/facility/?token=x#/data');
    runRestoreScript();
    expect(window.location.hash).toBe('#/data/import');
  });

  it('leaves the page alone when a redirect changed the path', () => {
    loadPage('/en/device/');
    runRestoreScript({ saved: '/en/auth/#/signin' });
    expect(window.location.hash).toBe('');
  });

  it('leaves the page alone when the query differs', () => {
    loadPage('/en/facility/?token=y');
    runRestoreScript();
    expect(window.location.hash).toBe('');
  });

  it('leaves the page alone when the saved location has no fragment', () => {
    loadPage('/en/learn/#/home');
    runRestoreScript({ saved: '/en/learn/' });
    expect(window.location.hash).toBe('#/home');
  });

  it('leaves a page on another origin alone', () => {
    loadPage('/en/facility/?token=x');
    runRestoreScript({ origin: 'http://127.0.0.1:46655' });
    expect(window.location.hash).toBe('');
  });

  it('restores only the first page it runs on', () => {
    loadPage('/en/facility/?token=x');
    runRestoreScript();
    loadPage('/en/facility/?token=x');
    runRestoreScript();
    expect(window.location.hash).toBe('');
  });
});
