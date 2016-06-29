<template>

  <div>
    <div v-el:container></div>
  </div>

</template>


<script>

  module.exports = {
    props: {
      contentData: {
        type: Object,
        default: () => ({ pk: 0 }),
      },
    },
    computed: {
      contentType() {
        if (this.contentData) {
          return `${this.contentData.kind}/${this.extension}`;
        }
        return '';
      },
      extension() {
        if (this.availableFiles.length > 0) {
          return this.availableFiles[0].extension;
        }
        return '';
      },
      availableFiles() {
        if (typeof this.contentData !== 'undefined' & Array.isArray(this.contentData.files)) {
          return this.contentData.files.filter(
            (file) => !file.thumbnail & !file.supplementary & file.available
          );
        }
        return [];
      },
    },
    init() {
      this._eventListeners = [];
    },
    created() {
      this.findRendererComponent();
      // This means this component has to be torn down on channel switches.
      this.$watch('contentData.pk', this.findRendererComponent);
    },
    ready() {
      this.ready = true;
      this.renderContent();
    },
    data: () => ({
      currentViewClass: null,
    }),
    methods: {
      clearListeners() {
        this._eventListeners.forEach((listener) => {
          this.Kolibri.off(listener.event, listener.callback);
        });
        this._eventListeners = [];
      },
      findRendererComponent() {
        this.rendered = false;
        this.clearListeners();
        const event = `component_render:${this.contentType}`;
        const callback = this.setRendererComponent;
        this.Kolibri.once(event, callback);
        this._eventListeners.push({ event, callback });
        this.Kolibri.emit(`content_render:${this.contentType}`);
      },
      setRendererComponent(component) {
        this.currentViewClass = component;
        if (this.ready && !this.rendered) {
          this.renderContent();
        }
      },
      renderContent() {
        if (this.currentViewClass !== null) {
          this.rendered = true;
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
          propsData.defaultFile = this.availableFiles[0];
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
