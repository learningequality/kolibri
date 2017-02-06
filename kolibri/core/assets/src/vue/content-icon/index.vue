<template>

  <div>
    <mat-svg
      v-if="is(Constants.ContentNodeKinds.TOPIC)"
      category="file"
      name="folder"
      :class="[colorClass]"/>
    <mat-svg
      v-if="is(Constants.ContentNodeKinds.VIDEO)"
      category="notification"
      name="ondemand_video"
      :class="[colorClass]"/>
    <mat-svg
      v-if="is(Constants.ContentNodeKinds.AUDIO)"
      category="image"
      name="audiotrack"
      :class="[colorClass]"/>
    <ion-svg
      v-if="is(Constants.ContentNodeKinds.DOCUMENT)"
      name="document"
      :class="[colorClass]"/>
    <mat-svg
      v-if="is(Constants.ContentNodeKinds.EXERCISE)"
      category="toggle"
      name="star"
      :class="[colorClass]"/>
    <mat-svg
      v-if="is(Constants.ContentNodeKinds.HTML5)"
      category="device"
      name="widgets"
      :class="[colorClass]"/>
    <mat-svg
      v-if="is(Constants.USER)"
      category="social"
      name="person"
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
