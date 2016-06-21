<template>

  <div>
    <h3>
      {{ title }}
    </h3>
    <div v-el:container></div>
  </div>

</template>


<script>

  module.exports = {
    props: {
      channelId: String,
      contentId: String,
      kind: String,
      extension: String,
      title: String,
      contentData: {
        type: Object,
        default: () => ({ url: '#' }),
      },

    },
    computed: {
      contentType() {
        return `${this.kind}/${this.extension}`;
      },
    },
    ready() {
      this.Kolibri.once(`component_render:${this.contentType}`, this.setRendererComponent);
      this.Kolibri.emit(`content_render:${this.contentType}`);
    },
    data: () => ({
      currentView: null,
    }),
    methods: {
      setRendererComponent(component) {
        const options = {
          parent: this,
          el: this.$els.container,
        };
        Object.assign(options, component);
        this.currentView = new this.Kolibri.lib.vue(options); // eslint-disable-line new-cap
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

</style>
