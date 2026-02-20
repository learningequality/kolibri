<script>

  export default {
    name: 'Prompt',
    tag: 'qti-prompt',
    functional: true,
    render(h, context) {
      if (context.children.some(c => !c.tag && !c.componentOptions)) {
        // If there are pure text children we need to wrap them in a paragraph
        // to ensure proper formatting and spacing.
        // We add the safe-html class to inherit styling from the wrapping
        // SafeHTML component.
        return h('p', { attrs: { class: 'safe-html' } }, context.children);
      }
      return context.children;
    },
  };

</script>
