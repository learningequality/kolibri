<template>

  <span>
    <ui-icon>
      <mat-svg
        v-if="is(Constants.ContentNodeKinds.CHANNEL)"
        category="navigation"
        name="apps"
        :class="[colorClass]" />
      <mat-svg
        v-if="is(Constants.ContentNodeKinds.TOPIC)"
        category="file"
        name="folder"
        :class="[colorClass]" />
      <mat-svg
        v-if="is(Constants.ContentNodeKinds.VIDEO)"
        category="notification"
        name="ondemand_video"
        :class="[colorClass]" />
      <mat-svg
        v-if="is(Constants.ContentNodeKinds.AUDIO)"
        category="image"
        name="audiotrack"
        :class="[colorClass]" />
      <mat-svg
        v-if="is(Constants.ContentNodeKinds.DOCUMENT)"
        category="action"
        name="book"
        :class="[colorClass]" />
      <mat-svg
        v-if="is(Constants.ContentNodeKinds.EXERCISE)"
        category="action"
        name="assignment"
        :class="[colorClass, { 'rtl-icon': isRtl }]" />
      <mat-svg
        v-if="is(Constants.ContentNodeKinds.HTML5)"
        category="device"
        name="widgets"
        :class="[colorClass]" />
      <mat-svg
        v-if="is(Constants.USER)"
        category="social"
        name="person"
        :class="[colorClass]" />
    </ui-icon>
  </span>

</template>


<script>

  import * as Constants from 'kolibri.coreVue.vuex.constants';
  import values from 'lodash/values';
  import uiIcon from 'keen-ui/src/UiIcon';
  export default {
    components: { uiIcon },
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

  @require '~kolibri.styles.definitions'

  .ui-icon
    font-size: 1em

</style>
