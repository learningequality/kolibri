import { render } from '@testing-library/vue';
import usePageTitle from 'kolibri/composables/usePageTitle';
import ImmersivePage from 'kolibri/components/pages/ImmersivePage';

export function titledPage(title, content = () => []) {
  return {
    name: 'TestPage',
    setup() {
      usePageTitle(title);
    },
    render: h => h(ImmersivePage, content(h)),
  };
}

export function settle() {
  return new Promise(resolve => setTimeout(resolve));
}

export async function renderAt(vueRouter, path) {
  window.location.hash = `#${path}`;
  render({ name: 'App', render: h => h('router-view') }, { router: vueRouter });
  await settle();
}
