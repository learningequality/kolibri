<template>

  <span>
    <UiIcon ref="icon">
      <KIcon
        v-if="is(ContentNodeKinds.CHANNEL)"
        :icon="ContentNodeKinds.CHANNEL"
        :class="[colorClass]"
        :color="color"
        style="top: 0"
      />
      <KIcon
        v-if="is(ContentNodeKinds.TOPIC)"
        :icon="ContentNodeKinds.TOPIC"
        :class="[colorClass]"
        :color="color"
        style="top: 0"
      />
      <KIcon
        v-if="is(ContentNodeKinds.VIDEO)"
        :icon="ContentNodeKinds.VIDEO"
        :class="[colorClass]"
        :color="color"
        style="top: 0"
      />
      <KIcon
        v-if="is(ContentNodeKinds.AUDIO)"
        :icon="ContentNodeKinds.AUDIO"
        :class="[colorClass]"
        :color="color"
        style="top: 0"
      />
      <KIcon
        v-if="is(ContentNodeKinds.DOCUMENT)"
        :icon="ContentNodeKinds.DOCUMENT"
        :class="[colorClass]"
        :color="color"
        style="top: 0"
      />
      <KIcon
        v-if="is(ContentNodeKinds.EXERCISE)"
        :icon="ContentNodeKinds.EXERCISE"
        :class="[colorClass, { 'rtl-icon': isRtl }]"
        :color="color"
        style="top: 0"
      />
      <KIcon
        v-if="is(ContentNodeKinds.HTML5)"
        :icon="ContentNodeKinds.HTML5"
        :class="[colorClass]"
        :color="color"
        style="top: 0"
      />
      <KIcon
        v-if="is(ContentNodeKinds.EXAM)"
        icon="quiz"
        :class="[colorClass]"
        :color="color"
        style="top: 0"
      />
      <KIcon
        v-if="is(ContentNodeKinds.LESSON)"
        :icon="ContentNodeKinds.LESSON"
        :class="[colorClass]"
        :color="color"
        style="top: 0"
      />
      <!-- Note that there is currently no `activity` icon token defined -->
      <!-- constant value comes all caps, but KIcon tokens are all lower case -->
      <KIcon
        v-if="is(ContentNodeKinds.ACTIVITY)"
        :icon="ContentNodeKinds.ACTIVITY.toLowerCase()"
        :class="[colorClass]"
        :color="color"
        style="top: 0"
      />
      <KIcon
        v-if="is(ContentNodeKinds.SLIDESHOW)"
        :icon="ContentNodeKinds.SLIDESHOW"
        :class="[colorClass]"
        :color="color"
        style="top: 0"
      />
      <KIcon
        v-if="is(USER)"
        :icon="USER"
        :class="[colorClass]"
        :color="color"
        style="top: 0"
      />
      <!-- class icon uses a different token name than the constant's name -->
      <KIcon
        v-if="is(ContentNodeKinds.CLASSROOM)"
        icon="classes"
        :class="[colorClass]"
        :color="color"
        style="top: 0"
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

  import { validateContentNodeKind } from 'kolibri/utils/validators';
  import { ContentNodeKinds, USER } from 'kolibri/constants';
  import UiIcon from 'kolibri-design-system/lib/keen/UiIcon';

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
      topic: {
        message: 'Folder',
        context:
          'A folder contains a set of learning resources and other subfolders within a channel. Nested folders allow a channel to be organized as a tree or hierarchy.',
      },
      channel: {
        message: 'Channel',
        context:
          'A channel is a set of learning resources that can be imported to and exported from Kolibri. It is often curated in order to achieve certain pre-defined learning objectives. Channels are originally created within Kolibri Studio.',
      },
      exercise: {
        message: 'Exercise',
        context:
          'An exercise is an interactive formative assessment resource. Exercises usually contain multiple questions, and have an associated mastery model.\n\nIndividual questions from exercises are also used to create summative assessments in the form of quizzes.',
      },
      video: {
        message: 'Video',
        context:
          'A video is a type of learning resource that is available in Kolibri. Other types of resources are documents, exercises or slideshows.',
      },
      audio: {
        message: 'Audio',
        context:
          'Audio is a type of education material available to learners in Kolibri. Other types of material could be exercises, videos or document files.',
      },
      document: {
        message: 'Document',
        context:
          'A document is a type of learning resource that is available in Kolibri. Other types of resources are videos, exercises or slideshows.',
      },
      html5: {
        message: 'App',
        context:
          'In Kolibri, an app is a certain kind of learning resource. Specifically, apps are generally self-contained, interactive HTML and Javascript applications.',
      },
      exam: {
        message: 'Quiz',
        context:
          'A quiz is an assessment made up of questions taken from exercises. Quizzes are created by coaches and then assigned to learners in a class.\n\nWe intentionally renamed "exam" to "quiz" in order to encourage use as an informal diagnostic tool for teachers.',
      },
      lesson: {
        message: 'Lesson',
        context:
          'A lesson is a linear learning pathway defined by a coach. The coach can select resources from any channel, add them to the lesson, define the ordering, and assign the lesson to learners in their class.',
      },
      user: {
        message: 'User',
        context:
          'A user is any person who has access to a facility in Kolibri. There are four main types of users in Kolibri: Learners, Coaches, Admins and Super admins.',
      },
      slideshow: {
        message: 'Slideshow',
        context:
          'A slideshow is a type of learning resource that is available in Kolibri. Slideshows contain slides and you navigate through them using arrows. Other types of resources are videos, exercises or documents.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .ui-icon {
    font-size: 1em;
  }

</style>
