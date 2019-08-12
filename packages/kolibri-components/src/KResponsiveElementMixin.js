/*
  Apply this mixin to your vue components to get reactive information
  about the component's size.

  Adds a couple reactive properties to your vue model:

    this.elementHeight   // component's $el height in pixels
    this.elementWidth    // component's $el width in pixels

*/

import ResizeSensor from 'css-element-queries/src/ResizeSensor';

export default {
  data() {
    return {
      elementWidth: 0,
      elementHeight: 0,
    };
  },
  methods: {
    _updateEl() {
      this.elementWidth = this.$el.clientWidth;
      this.elementHeight = this.$el.clientHeight;
    },
  },
  mounted() {
    this._updateEl();
    this.$options._resizeSensor = new ResizeSensor(this.$el, this._updateEl);
  },
  updated() {
    this._updateEl();
  },
  beforeDestroy() {
    this.$options._resizeSensor.detach(this.$el, this._updateEl);
  },
};
