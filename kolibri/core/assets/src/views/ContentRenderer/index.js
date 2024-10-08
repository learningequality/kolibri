import { RENDERER_SUFFIX } from 'kolibri.coreVue.vuex.constants';
import ContentRendererError from './ContentRendererError';
import { canRenderContent, getRenderableFiles, getDefaultFile, getFilePreset } from './utils';

export default {
  functional: true,
  render: function (createElement, context) {
    const defaultItemPreset = getFilePreset(
      getDefaultFile(getRenderableFiles(context.props.files)),
      context.props.preset,
    );
    if (canRenderContent(defaultItemPreset)) {
      return createElement(
        defaultItemPreset + RENDERER_SUFFIX,
        {
          ...context.data,
          props: context.props,
        },
        context.children,
      );
    }
    return createElement(ContentRendererError);
  },
};
