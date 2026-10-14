<script>

  import { computed, h, ref, watch } from 'vue';
  import logger from 'kolibri-logging';

  const logging = logger.getLogger(__filename);

  export default {
    name: 'SafeHtmlMath',
    inheritAttrs: false,

    setup(props, { attrs, slots }) {
      const output = ref(null);
      const rendered = ref(false);
      const label = computed(
        () => props.node.getAttribute('aria-label') || props.node.getAttribute('alttext'),
      );

      watch(() => props.node, renderNode, { immediate: true });

      async function renderNode(node) {
        // The previous expression's output would show until this one renders.
        if (output.value) {
          output.value.innerHTML = '';
        }
        rendered.value = false;
        // MathJax copies unknown attributes onto its output. A link or tabindex
        // there would take focus inside aria-hidden, and an id would repeat the
        // native copy's. Chromium < 109 doesn't render MathML links either.
        const math = node.cloneNode(true);
        for (const element of [math, ...math.querySelectorAll('[href], [id]')]) {
          element.removeAttribute('href');
          element.removeAttribute('id');
          element.removeAttribute('tabindex');
        }
        const mml = new XMLSerializer().serializeToString(math);
        const { renderMathML } = await import('./mathjax');
        // Every expression resumes from the same import; one task each lets the
        // page paint and take input between them.
        await new Promise(resolve => setTimeout(resolve));
        // Unmounting while MathJax loaded nulls the ref.
        if (!output.value || node !== props.node) {
          return;
        }
        let element = null;
        try {
          element = renderMathML(mml, node.getAttribute('display') === 'block');
        } catch (error) {
          // MathJax rejects some MathML browsers still show, such as bare text
          // in <math>; the native element is the fallback.
          logging.warn(error);
        }
        if (element) {
          output.value.appendChild(element);
        }
        rendered.value = Boolean(element);
      }

      // The native MathML stays as the accessible copy, visually hidden once
      // MathJax renders, so a failed load still shows the math and a live region
      // announces it in place with the text around it.
      // Attributes go on as attributes: Vue writes a bound style through
      // `el.style`, which MathML elements lack before Chromium 109.
      // A tabindex moves to the wrapper with it, so focus never lands out of sight.
      const nativeMath = () => {
        const className = rendered.value ? 'visuallyhidden' : 'safe-html';
        return h(
          'math',
          {
            attrs: {
              ...attrs,
              class: attrs.class ? `${attrs.class} ${className}` : className,
              tabindex: rendered.value ? null : attrs.tabindex,
            },
          },
          slots.default && slots.default(),
        );
      };

      return () =>
        h(
          'span',
          {
            class: 'safe-html-math',
            attrs: {
              'data-testid': 'mathjax-output',
              'aria-hidden': attrs['aria-hidden'],
              role: label.value ? 'img' : null,
              'aria-label': label.value || null,
              tabindex: rendered.value ? attrs.tabindex : null,
            },
          },
          [h('span', { ref: output, attrs: { 'aria-hidden': 'true' } }), nativeMath()],
        );
    },

    props: {
      node: {
        required: true,
        validator: node => node && typeof node.getAttribute === 'function',
      },
    },
  };

</script>


<style scoped>

  /* Mirrors math.safe-html in style.scss. Line height stays MathJax's own, which
     its glyph layout depends on. */
  .safe-html-math /deep/ mjx-container {
    font-size: 32px;
  }

  .safe-html-math /deep/ mjx-container[display='true'] {
    margin: 8px auto;
  }

  .safe-html-math:focus-visible {
    outline: 3px solid var(--tokens-focusOutline) !important;
  }

</style>
