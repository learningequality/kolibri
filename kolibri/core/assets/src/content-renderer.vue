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
          const propsData = {};
          const enumerables = Object.keys(this.contentData);
          const properties = Object.getOwnPropertyNames(this.contentData).filter(
            (name) => enumerables.indexOf(name) > -1
          );
          for (const key in properties) {
            if (key !== 'extra_fields') {
              propsData[key] = this.contentData[key];
            } else {
              Object.assign(propsData, JSON.parse(this.contentData[key]));
            }
          }
          const options = {
            parent: this,
            el: this.$els.container,
            propsData,
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
