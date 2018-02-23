<template>

  <span>
    <ui-icon ref="type-icon">
      <mat-svg
        v-if="is(Constants.ContentNodeKinds.CHANNEL)"
        category="navigation"
        name="apps"
        :class="[colorClass]"
      />
      <mat-svg
        v-if="is(Constants.ContentNodeKinds.TOPIC)"
        category="file"
        name="folder"
        :class="[colorClass]"
      />
      <mat-svg
        v-if="is(Constants.ContentNodeKinds.VIDEO)"
        category="notification"
        name="ondemand_video"
        :class="[colorClass]"
      />
      <mat-svg
        v-if="is(Constants.ContentNodeKinds.AUDIO)"
        category="image"
        name="audiotrack"
        :class="[colorClass]"
      />
      <mat-svg
        v-if="is(Constants.ContentNodeKinds.DOCUMENT)"
        category="action"
        name="book"
        :class="[colorClass]"
      />
      <mat-svg
        v-if="is(Constants.ContentNodeKinds.EXERCISE)"
        category="action"
        name="assignment"
        :class="[colorClass, { 'rtl-icon': isRtl }]"
      />
      <mat-svg
        v-if="is(Constants.ContentNodeKinds.HTML5)"
        category="device"
        name="widgets"
        :class="[colorClass]"
      />
      <mat-svg
        v-if="is(Constants.ContentNodeKinds.EXAM)"
        category="action"
        name="assignment_late"
        :class="[colorClass]"
      />
      <mat-svg
        v-if="is(Constants.ContentNodeKinds.LESSON)"
        category="communication"
        name="import_contacts"
        :class="[colorClass]"
      />
      <mat-svg
        v-if="is(Constants.USER)"
        category="social"
        name="person"
        :class="[colorClass]"
      />
    </ui-icon>
    <ui-tooltip trigger="type-icon" position="top middle">{{ tooltipText }}</ui-tooltip>
  </span>

</template>


<script>

  import * as Constants from 'kolibri.coreVue.vuex.constants';
  import values from 'lodash/values';
  import uiIcon from 'keen-ui/src/UiIcon';
  import uiTooltip from 'keen-ui/src/UiTooltip';

  export default {
    name: 'contentIcon',
    $trs: {
      topic: 'Topic',
      channel: 'Channel',
      exercise: 'Exercise',
      video: 'Video',
      audio: 'Audio',
      document: 'Document',
      html5: 'App',
      exam: 'Exam',
      lesson: 'Lesson',
      user: 'User',
    },
    components: {
      uiIcon,
      uiTooltip,
    },
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
      tooltipText() {
        const kind = this.kind;
        if (kind === Constants.ContentNodeKinds.TOPIC) {
          return this.$tr('topic');
        } else if (kind === Constants.ContentNodeKinds.CHANNEL) {
          return this.$tr('channel');
        } else if (kind === Constants.ContentNodeKinds.EXERCISE) {
          return this.$tr('exercise');
        } else if (kind === Constants.ContentNodeKinds.VIDEO) {
          return this.$tr('video');
        } else if (kind === Constants.ContentNodeKinds.AUDIO) {
          return this.$tr('audio');
        } else if (kind === Constants.ContentNodeKinds.DOCUMENT) {
          return this.$tr('document');
        } else if (kind === Constants.ContentNodeKinds.HTML5) {
          return this.$tr('html5');
        } else if (kind === Constants.ContentNodeKinds.EXAM) {
          return this.$tr('exam');
        } else if (kind === Constants.ContentNodeKinds.LESSON) {
          return this.$tr('lesson');
        } else if (kind === Constants.USER) {
          return this.$tr('user');
        }
        return '';
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
