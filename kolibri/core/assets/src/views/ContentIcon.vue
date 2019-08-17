<template>

  <span>
    <UiIcon ref="icon">
      <mat-svg
        v-if="is(ContentNodeKinds.CHANNEL)"
        category="navigation"
        name="apps"
        :class="[colorClass]"
      />
      <mat-svg
        v-if="is(ContentNodeKinds.TOPIC)"
        category="file"
        name="folder"
        :class="[colorClass]"
      />
      <mat-svg
        v-if="is(ContentNodeKinds.VIDEO)"
        category="notification"
        name="ondemand_video"
        :class="[colorClass]"
      />
      <mat-svg
        v-if="is(ContentNodeKinds.AUDIO)"
        category="image"
        name="audiotrack"
        :class="[colorClass]"
      />
      <mat-svg
        v-if="is(ContentNodeKinds.DOCUMENT)"
        category="action"
        name="book"
        :class="[colorClass]"
      />
      <mat-svg
        v-if="is(ContentNodeKinds.EXERCISE)"
        category="action"
        name="assignment"
        :class="[colorClass, { 'rtl-icon': isRtl }]"
      />
      <mat-svg
        v-if="is(ContentNodeKinds.HTML5)"
        category="device"
        name="widgets"
        :class="[colorClass]"
      />
      <mat-svg
        v-if="is(ContentNodeKinds.EXAM)"
        category="action"
        name="assignment_late"
        :class="[colorClass]"
      />
      <mat-svg
        v-if="is(ContentNodeKinds.LESSON)"
        category="communication"
        name="import_contacts"
        :class="[colorClass]"
      />
      <mat-svg
        v-if="is(ContentNodeKinds.ACTIVITY)"
        category="device"
        name="access_time"
        :class="[colorClass]"
      />
      <mat-svg
        v-if="is(ContentNodeKinds.SLIDESHOW)"
        category="image"
        name="photo_library"
        :class="[colorClass]"
      />
      <mat-svg
        v-if="is(USER)"
        category="social"
        name="person"
        :class="[colorClass]"
      />
      <mat-svg
        v-if="is(ContentNodeKinds.CLASSROOM)"
        category="communication"
        name="business"
        :class="[colorClass]"
      />
    </UiIcon>
    <KTooltip
      v-if="tooltipText && showTooltip"
      reference="icon"
      :refs="$refs"
    >
      {{ tooltipText }}
    </KTooltip>
  </span>

</template>


<script>

  import { validateContentNodeKind } from 'kolibri.utils.validators';
  import { ContentNodeKinds, USER } from 'kolibri.coreVue.vuex.constants';
  import UiIcon from 'keen-ui/src/UiIcon';

  export default {
    name: 'ContentIcon',
    components: {
      UiIcon,
    },
    props: {
      kind: {
        type: String,
        required: true,
        validator(value) {
          return validateContentNodeKind(value, [USER]);
        },
      },
      colorStyle: {
        type: String,
        default: 'action',
      },
      showTooltip: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      ContentNodeKinds() {
        return ContentNodeKinds;
      },
      USER() {
        return USER;
      },
      colorClass() {
        return `color-${this.colorStyle}`;
      },
      tooltipText() {
        const kindToLabeLMap = {
          [ContentNodeKinds.TOPIC]: 'topic',
          [ContentNodeKinds.CHANNEL]: 'channel',
          [ContentNodeKinds.EXERCISE]: 'exercise',
          [ContentNodeKinds.VIDEO]: 'video',
          [ContentNodeKinds.AUDIO]: 'audio',
          [ContentNodeKinds.DOCUMENT]: 'document',
          [ContentNodeKinds.HTML5]: 'html5',
          [ContentNodeKinds.EXAM]: 'exam',
          [ContentNodeKinds.LESSON]: 'lesson',
          [ContentNodeKinds.SLIDESHOW]: 'slideshow',
          [USER]: 'user',
        };
        const label = kindToLabeLMap[this.kind];
        return label ? this.$tr(label) : '';
      },
    },
    methods: {
      is(kind) {
        return this.kind === kind;
      },
    },
    $trs: {
      topic: 'Topic',
      channel: 'Channel',
      exercise: 'Exercise',
      video: 'Video',
      audio: 'Audio',
      document: 'Document',
      html5: 'App',
      exam: 'Quiz',
      lesson: 'Lesson',
      user: 'User',
      slideshow: 'Slideshow',
    },
  };

</script>


<style lang="scss" scoped>

  .ui-icon {
    font-size: 1em;
  }

</style>
