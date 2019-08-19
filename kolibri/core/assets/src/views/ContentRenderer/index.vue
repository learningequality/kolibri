<script>

  import logger from 'kolibri.lib.logging';
  import heartbeat from 'kolibri.heartbeat';
  import contentRendererMixin from 'kolibri.coreVue.mixins.contentRendererMixin';

  const logging = logger.getLogger(__filename);

  const activeCallback = heartbeat.setUserActive;

  export default {
    name: 'ContentRenderer',
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
      if (this.available) {
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
        return createElement(this.preset + '_renderer', {
          props: this.$props,
          on: listeners,
          ref: 'contentView',
        });
      } else {
        return createElement('div', this.$tr('msgNotAvailable'));
      }
    },
    $trs: {
      msgNotAvailable: 'This content is not available',
    },
  };

</script>
