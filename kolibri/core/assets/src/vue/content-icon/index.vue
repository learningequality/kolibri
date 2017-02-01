<template>

  <div>
    <svg
      v-if="is(Constants.ContentNodeKinds.TOPIC)"
      icon-name="material-file-folder"
      :class="[colorClass]"/>
    <svg
      v-if="is(Constants.ContentNodeKinds.VIDEO)"
      icon-name="material-notification-ondemand_video"
      :class="[colorClass]"/>
    <svg
      v-if="is(Constants.ContentNodeKinds.AUDIO)"
      icon-name="material-image-audiotrack"
      :class="[colorClass]"/>
    <svg
      v-if="is(Constants.ContentNodeKinds.DOCUMENT)"
      src="./content-icons/document.svg"
      :class="[colorClass]"/>
    <svg
      v-if="is(Constants.ContentNodeKinds.EXERCISE)"
      icon-name="material-toggle-star"
      :class="[colorClass]"/>
    <svg
      v-if="is(Constants.ContentNodeKinds.HTML5)"
      icon-name="material-device-widgets"
      :class="[colorClass]"/>
    <svg
      v-if="is(Constants.USER)"
      icon-name="material-social-person"
      :class="[colorClass]"/>
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

  svg
    width: 100%
    height: 100%
    max-width: 24px
    max-height: 24px
    fill: $core-text-default

  .color-action
    fill: $core-action-normal

  .color-text-default
    fill: $core-text-default

</style>
