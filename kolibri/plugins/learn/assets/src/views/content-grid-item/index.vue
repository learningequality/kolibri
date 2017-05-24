<template>

  <div :class="sizeClass">
    <grid-item :link="link" :title="title" :kind="kind" :progress="progress" :thumbnail="thumbnail">
    </grid-item>
  </div>

</template>


<script>

  const CoreConstants = require('kolibri.coreVue.vuex.constants');
  const values = require('lodash/values');
  const responsiveWindow = require('kolibri.coreVue.mixins.responsiveWindow');
  const validateLinkObject = require('kolibri.utils.validateLinkObject');

  module.exports = {
    mixins: [responsiveWindow],
    components: {
      'grid-item': require('../card-grid/grid-item'),
    },
    props: {
      title: {
        type: String,
        required: true,
      },
      thumbnail: {
        type: String,
        required: false,
      },
      kind: {
        type: String,
        required: true,
        validator(value) {
          return values(CoreConstants.ContentNodeKinds).includes(value);
        },
      },
      progress: {
        type: Number,
        required: true,
        default: 0.0,
        validator(value) {
          return (value >= 0.0) && (value <= 1.0);
        },
      },
      link: {
        type: Object,
        required: true,
        validator: validateLinkObject,
      },
    },
    computed: {
      sizeClass() {
        if (this.windowSize.breakpoint === 0) { return 'pure-u-1-1'; }
        if (this.windowSize.breakpoint === 1) { return 'pure-u-1-2'; }
        if (this.windowSize.breakpoint === 2) { return 'pure-u-1-2'; }
        if (this.windowSize.breakpoint === 3) { return 'pure-u-1-3'; }
        if (this.windowSize.breakpoint === 4) { return 'pure-u-1-3'; }
        if (this.windowSize.breakpoint === 5) { return 'pure-u-1-4'; }
        return 'pure-u-1-6';
      },
      thumb() {
        if (this.thumbnail) {
          return `url(${this.thumbnail})`;
        }
        return '';
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .thumbnail
    width: 100%
    height: 100%
    background-size: cover
    background-position: center
    background-color: black
    text-align: center
    position: relative

  .thumbnail:before
    content: ''
    display: inline-block
    vertical-align: middle
    height: 100%

</style>
