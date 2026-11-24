import { h, ref, watch } from 'vue';
import SafeHTML from '../SafeHTML';
import { createMarkdown, hasFormula } from './markdown';

let nextScope = 0;

function sourceFormula(content, markdown) {
  return `<span dir="ltr">${markdown.utils.escapeHtml(content)}</span>`;
}

const markdown = createMarkdown((content, display, markdown, env) => {
  try {
    return env.renderTex ? env.renderTex(content, display) : sourceFormula(content, markdown);
  } catch {
    return sourceFormula(content, markdown);
  }
});

export default {
  name: 'SafeMarkdown',
  props: {
    text: { type: String, required: true },
  },
  setup(props) {
    const html = ref('');
    const scope = `safe-markdown-${nextScope++}-`;
    let createTexRenderer;
    watch(
      () => props.text,
      async (text, previousText, onCleanup) => {
        const env = {};
        const tokens = markdown.parse(text, env);
        const containsMath = hasFormula(tokens);
        if (!containsMath || !createTexRenderer) {
          html.value = markdown.renderer.render(tokens, markdown.options, env);
        }
        if (!containsMath) {
          return;
        }
        if (!createTexRenderer) {
          let stale = false;
          onCleanup(() => {
            stale = true;
          });
          const tex = await import('./tex').catch(error => {
            if (!stale) {
              throw error;
            }
          });
          if (stale) {
            return;
          }
          createTexRenderer = tex.createTexRenderer;
        }
        const renderTex = createTexRenderer(scope);
        env.renderTex = renderTex;
        html.value = markdown.renderer.render(tokens, markdown.options, env);
      },
      { immediate: true },
    );
    return () => h(SafeHTML, { attrs: { dir: 'auto' }, props: { html: html.value } });
  },
};
