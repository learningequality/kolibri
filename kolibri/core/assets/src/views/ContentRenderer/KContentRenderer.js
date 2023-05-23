import heartbeat from 'kolibri.heartbeat';
import { RENDERER_SUFFIX } from './constants';
import contentRendererMixin, { interactionEvents } from './mixin';
import ContentRendererError from './ContentRendererError';

export default {
  components: {
    ContentRendererError,
  },
  mixins: [contentRendererMixin],
  methods: {
    registerContentActivity() {
      heartbeat.setUserActive();
    },
    /**
     * @public
     */
    checkAnswer() {
      if (this.$refs.contentView && this.$refs.contentView.checkAnswer) {
        this.registerContentActivity();
        return this.$refs.contentView.checkAnswer();
        /* eslint-disable no-console */
      } else if (!this.$refs.contentView) {
        console.warn('No content view to check answer of');
      } else if (!this.$refs.contentView.checkAnswer) {
        console.warn('This content renderer has not implemented the checkAnswer method');
        /* eslint-enable */
      }
      return null;
    },
  },
  render: function(createElement) {
    if (this.canRenderContent(this.defaultItemPreset)) {
      const listeners = {
        ...this.$listeners,
      };
      for (const event of interactionEvents) {
        if (listeners[event]) {
          if (Array.isArray(listeners[event])) {
            listeners[event] = [...listeners[event], this.registerContentActivity];
          } else {
            listeners[event] = [listeners[event], this.registerContentActivity];
          }
        } else {
          listeners[event] = this.registerContentActivity;
        }
      }
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
