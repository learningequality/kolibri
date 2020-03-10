<template>

  <span>
    <UiIcon ref="icon">
      <KIcon
        v-if="is(ContentNodeKinds.CHANNEL)"
        :icon="ContentNodeKinds.CHANNEL"
        :class="[colorClass]"
        :color="color"
        style="top:0;"
      />
      <KIcon
        v-if="is(ContentNodeKinds.TOPIC)"
        :icon="ContentNodeKinds.TOPIC"
        :class="[colorClass]"
        :color="color"
        style="top:0;"
      />
      <KIcon
        v-if="is(ContentNodeKinds.VIDEO)"
        :icon="ContentNodeKinds.VIDEO"
        :class="[colorClass]"
        :color="color"
        style="top:0;"
      />
      <KIcon
        v-if="is(ContentNodeKinds.AUDIO)"
        :icon="ContentNodeKinds.AUDIO"
        :class="[colorClass]"
        :color="color"
        style="top:0;"
      />
      <KIcon
        v-if="is(ContentNodeKinds.DOCUMENT)"
        :icon="ContentNodeKinds.DOCUMENT"
        :class="[colorClass]"
        :color="color"
        style="top:0;"
      />
      <KIcon
        v-if="is(ContentNodeKinds.EXERCISE)"
        :icon="ContentNodeKinds.EXERCISE"
        :class="[colorClass, { 'rtl-icon': isRtl }]"
        :color="color"
        style="top:0;"
      />
      <KIcon
        v-if="is(ContentNodeKinds.HTML5)"
        :icon="ContentNodeKinds.HTML5"
        :class="[colorClass]"
        :color="color"
        style="top:0;"
      />
      <KIcon
        v-if="is(ContentNodeKinds.EXAM)"
        :icon="ContentNodeKinds.EXAM"
        :class="[colorClass]"
        :color="color"
        style="top:0;"
      />
      <KIcon
        v-if="is(ContentNodeKinds.LESSON)"
        :icon="ContentNodeKinds.LESSON"
        :class="[colorClass]"
        :color="color"
        style="top:0;"
      />
      <KIcon
        v-if="is(ContentNodeKinds.ACTIVITY)"
        :icon="ContentNodeKinds.ACTIVITY"
        :class="[colorClass]"
        :color="color"
        style="top:0;"
      />
      <KIcon
        v-if="is(ContentNodeKinds.SLIDESHOW)"
        :icon="ContentNodeKinds.SLIDESHOW"
        :class="[colorClass]"
        :color="color"
        style="top:0;"
      />
      <KIcon
        v-if="is(USER)"
        :icon="USER"
        :class="[colorClass]"
        :color="color"
        style="top:0;"
      />
      <KIcon
        v-if="is(ContentNodeKinds.CLASSROOM)"
        :icon="ContentNodeKinds.CLASSROOM"
        :class="[colorClass]"
        :color="color"
        style="top:0;"
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
      color: {
        type: String,
        default: 'black',
        required: false,
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
