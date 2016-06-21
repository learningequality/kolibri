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
    created() {
      this.Kolibri.once(`component_render:${this.contentType}`, this.setRendererComponent);
      this.Kolibri.emit(`content_render:${this.contentType}`);
    },
    ready() {
      this.ready = true;
      this.renderContent();
    },
    data: () => ({
      currentViewClass: null,
    }),
    methods: {
      setRendererComponent(component) {
        this.currentViewClass = component;
        if (this.ready && !this.contentView) {
          this.renderContent();
        }
      },
      renderContent() {
        if (this.currentViewClass !== null) {
          const options = {
            parent: this,
            el: this.$els.container,
          };
          Object.assign(options, this.currentViewClass);
          this.contentView = new this.Kolibri.lib.vue(options); // eslint-disable-line new-cap
        }
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

</style>
