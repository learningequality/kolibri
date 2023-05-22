import { RENDERER_SUFFIX } from './constants';
import contentRendererMixin from './mixin';

export default {
  mixins: [contentRendererMixin],
  methods: {
    /**
     * @public
     */
    checkAnswer() {
      if (this.$refs.contentView && this.$refs.contentView.checkAnswer) {
        return this.$refs.contentView.checkAnswer();
        /* eslint-disable no-console */
      } else if (!this.$refs.contentView) {
        console.warn('No content view to check answer of');
      } else if (!this.$refs.contentView.checkAnswer) {
        console.warn('This content renderer has not implemented the checkAnswer method');
        /* eslint-enable */
      }
      this.registerContentActivity();
      return null;
    },
  },
  render: function(createElement) {
    if (this.canRenderContent(this.defaultItemPreset)) {
      const listeners = {
        ...this.$listeners,
      };
      contentRendererMixin.interactionEvents.forEach(event => {
        if (listeners[event]) {
          if (Array.isArray(listeners[event])) {
            listeners[event] = [...listeners[event], this.registerContentActivity];
          } else {
            listeners[event] = [listeners[event], this.registerContentActivity];
          }
        } else {
          listeners[event] = this.registerContentActivity;
        }
      });
      return createElement(this.defaultItemPreset + RENDERER_SUFFIX, {
        props: this.$props,
        attrs: this.$attrs,
        on: listeners,
        ref: 'contentView',
      });
    }
    return createElement('ContentRendererError');
  },
};
