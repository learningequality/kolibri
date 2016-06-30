<template>

  <div>
    <div v-if="available">
      <div v-el:container></div>
    </div>
    <div v-else>
      This content is not available.
    </div>
  </div>

</template>


<script>

  module.exports = {
    props: {
      pk: {
        type: Number,
        default: 0,
      },
      kind: {
        type: String,
      },
      files: {
        type: Array,
        default: () => [],
      },
      contentId: {
        type: String,
        default: '',
      },
      channelId: {
        type: String,
        default: '',
      },
      available: {
        type: Boolean,
        default: false,
      },
      extraFields: {
        type: String,
        default: '{}',
      },
    },
    computed: {
      contentType() {
        if (typeof this.kind !== 'undefined' & typeof this.extension !== 'undefined') {
          return `${this.kind}/${this.extension}`;
        }
        return undefined;
      },
      extension() {
        if (this.availableFiles.length > 0) {
          return this.availableFiles[0].extension;
        }
        return undefined;
      },
      availableFiles() {
        return this.files.filter(
          (file) => !file.thumbnail & !file.supplementary & file.available
        );
      },
    },
    init() {
      this._eventListeners = [];
    },
    created() {
      this.findRendererComponent();
      // This means this component has to be torn down on channel switches.
      this.$watch('pk', this.findRendererComponent);
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
        this.clearListeners();
        if (this.available) {
          this.rendered = false;
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
        if (this.currentViewClass !== null & this.available & !this.rendered) {
          this.rendered = true;
          const propsData = {};
          const enumerables = Object.keys(this.$options.props);
          const properties = Object.getOwnPropertyNames(this.$options.props).filter(
            (name) => enumerables.indexOf(name) > -1
          );
          for (const key in properties) {
            if (key !== 'extraFields') {
              propsData[key] = this[key];
            } else {
              Object.assign(propsData, JSON.parse(this[key]));
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
