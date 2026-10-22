import { render } from '@testing-library/vue';
// eslint-disable-next-line import-x/named
import useContentViewer, { useContentViewerMock } from 'kolibri/composables/useContentViewer';
import PerseusRendererIndex from '../views/PerseusRendererIndex';

export default async function mountRenderer(itemData, viewerOptions = {}, listeners = {}) {
  let instance = null;
  let registeredApi = null;
  useContentViewer.mockImplementation(() => ({
    ...useContentViewerMock({ itemData, interactive: true, ...viewerOptions }),
    registerAssessmentApi: api => {
      registeredApi = api;
    },
  }));
  PerseusRendererIndex.contentModule = { loadDirectionalCSS: () => Promise.resolve() };
  const Harness = {
    components: { PerseusRendererIndex },
    data: () => ({ listeners }),
    mounted() {
      instance = this.$refs.renderer;
    },
    template: `<PerseusRendererIndex ref="renderer" v-on="listeners" />`,
  };
  const utils = render(Harness);
  await global.flushPromises();
  await global.flushPromises();
  return { instance: () => instance, api: () => registeredApi, ...utils };
}
