import { RENDERER_SUFFIX } from './constants';

export default function contentRendererFactory({
  logging = console,
  activeCallback = () => {},
  contentRendererMixin,
} = {}) {
  return {
    mixins: [contentRendererMixin],
    methods: {
      /**
       * @public
       */
      checkAnswer() {
        if (this.$refs.contentView && this.$refs.contentView.checkAnswer) {
          return this.$refs.contentView.checkAnswer();
        } else if (!this.$refs.contentView) {
          logging.warn('No content view to check answer of');
        } else if (!this.$refs.contentView.checkAnswer) {
          logging.warn('This content renderer has not implemented the checkAnswer method');
        }
        activeCallback();
        return null;
      },
    },
    render: function(createElement) {
      const listeners = {
        ...this.$listeners,
      };
      contentRendererMixin.interactionEvents.forEach(event => {
        if (listeners[event]) {
          listeners[event] = [listeners[event], activeCallback];
        } else {
          listeners[event] = activeCallback;
        }
      });
      return createElement(this.defaultItemPreset + RENDERER_SUFFIX, {
        props: this.$props,
        on: listeners,
        ref: 'contentView',
      });
    },
  };
}
