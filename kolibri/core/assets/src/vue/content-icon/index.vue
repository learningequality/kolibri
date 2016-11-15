<template>

  <div>
    <svg
      v-if="is(Constants.ContentNodeKinds.TOPIC)"
      src="./content-icons/topic.svg"
      :class="['content-icon', colorClass]"
    ></svg>
    <svg
      v-if="is(Constants.ContentNodeKinds.VIDEO)"
      src="./content-icons/video.svg"
      :class="['content-icon', colorClass]"
    ></svg>
    <svg
      v-if="is(Constants.ContentNodeKinds.AUDIO)"
      src="./content-icons/audio.svg"
      :class="['content-icon', colorClass]"
    ></svg>
    <svg
      v-if="is(Constants.ContentNodeKinds.DOCUMENT)"
      src="./content-icons/document.svg"
      :class="['content-icon', colorClass]"
    ></svg>
    <svg
      v-if="is(Constants.ContentNodeKinds.EXERCISE)"
      src="./content-icons/exercise.svg"
      :class="['content-icon', colorClass]"
    ></svg>
    <svg
      v-if="is(Constants.USER)"
      src="./content-icons/user.svg"
      :class="['content-icon', colorClass]"
    ></svg>
  </div>

</template>


<script>

  const Constants = require('kolibri.coreVue.vuex.constants');
  const values = require('lodash.values');

  module.exports = {
    props: {
      kind: {
        type: String,
        required: true,
        validator(value) {
          const validValues = values(Constants.ContentNodeKinds);
          validValues.push(Constants.USER);
          return validValues.includes(value);
        },
      },
      colorstyle: {
        type: String,
        default: 'action',
      },
    },
    computed: {
      Constants() {
        return Constants;
      },
      colorClass() {
        return `color-${this.colorStyle}`;
      },
    },
    methods: {
      is(kind) {
        return this.kind === kind;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  .content-icon
    width: 100%
    height: 100%

  .color-action
    fill: $core-action-normal

  .color-text-default
    fill: $core-text-default

</style>
