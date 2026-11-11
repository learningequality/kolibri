import fs from 'node:fs';
import path from 'node:path';

const kolibriRequire = name =>
  require(require.resolve(name, { paths: [require.resolve('kolibri/router')] }));
const Vue = kolibriRequire('vue');
const VueRouter = kolibriRequire('vue-router');

const BRIDGE = 'kolibriBridge';
const TYPE = 'location';
const SCRIPT = fs
  .readFileSync(path.resolve(__dirname, '../src/kolibri_app/scripts/location.js'), 'utf8')
  .replace('__BRIDGE__', BRIDGE)
  .replace('__TYPE__', TYPE);

function runLocationScript(target) {
  const posted = [];
  target[BRIDGE] = { postMessage: message => posted.push(JSON.parse(message)) };
  target.eval(SCRIPT);
  return posted;
}

describe('location.js', () => {
  const { pushState, replaceState } = window.history;

  afterEach(() => {
    window.history.pushState = pushState;
    window.history.replaceState = replaceState;
    delete window[BRIDGE];
    document.body.innerHTML = '';
  });

  it('reports each route change the router makes', async () => {
    window.history.replaceState(null, '', '/en/facility/#/classes');
    const posted = runLocationScript(window);
    const vueRouter = new VueRouter({ routes: [{ path: '/classes' }, { path: '/data/import' }] });
    const app = new Vue({ router: vueRouter, render: h => h('div') });
    await new Promise(resolve => vueRouter.onReady(resolve));

    await vueRouter.push('/data/import');
    await vueRouter.replace('/classes');

    expect(posted.slice(-2)).toEqual([
      { type: TYPE, url: `${window.location.origin}/en/facility/#/data/import` },
      { type: TYPE, url: `${window.location.origin}/en/facility/#/classes` },
    ]);
    app.$destroy();
  });

  it('reports nothing from a child frame', () => {
    const frame = document.createElement('iframe');
    document.body.appendChild(frame);
    const posted = runLocationScript(frame.contentWindow);

    frame.contentWindow.history.pushState(null, '');

    expect(posted).toEqual([]);
  });
});
