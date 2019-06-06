<template>

  <a
    role="button"
    tabindex="0"
    :class="[
      'transcript-cue',
      { active },
      $computedClass(style)
    ]"
    :dir="dir"
    :title="$tr('title', { startTime })"
    :aria-current="active.toString()"
    @click="triggerSeekEvent"
    @keypress.enter="triggerSeekEvent"
  >
    <span class="transcript-cue-time" :aria-label="$tr('timeLabel')">{{ startTime }}</span>
    <span class="transcript-cue-text" :aria-label="$tr('textLabel')">
      <strong v-if="speaker">{{ speaker }}</strong>
      {{ text }}
    </span>
  </a>

</template>


<script>

  import videojs from 'video.js';
  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import { getLangDir } from 'kolibri.utils.i18n';

  const SPEAKER_REGEX = /<v ([^>]+)>/i;

  export default {
    name: 'TranscriptCue',

    mixins: [themeMixin],

    props: {
      cue: Object,
      mediaDuration: Number,
      langCode: String,
      active: {
        type: Boolean,
        default: false,
      },
    },

    data: () => ({}),

    computed: {
      startTime() {
        return videojs.formatTime(this.cue.startTime, this.mediaDuration);
      },

      dir() {
        return getLangDir(this.langCode);
      },

      style() {
        const activeStyles = this.active
          ? {
              backgroundColor: this.$themeColors.palette.grey.v_200,
              borderLeftColor: this.$themeTokens.video,
            }
          : {};

        return Object.assign(activeStyles, {
          ':hover': {
            backgroundColor: this.$themeColors.palette.grey.v_100,
          },
          ':focus': this.$coreOutline,
        });
      },

      speaker() {
        return this.cue.text.match(SPEAKER_REGEX)
          ? this.cue.text.replace(SPEAKER_REGEX, '$1')
          : null;
      },

      text() {
        return this.cue.text.replace(SPEAKER_REGEX, '');
      },
    },

    methods: {
      triggerSeekEvent() {
        this.$emit('seek', this.cue.startTime);
        this.$el.focus({
          preventScroll: true,
        });
      },

      /**
       * @public
       */
      offsetTop() {
        return this.$el.offsetTop;
      },

      /**
       * @public
       */
      height() {
        return this.$el.offsetHeight;
      },
    },
    $trs: {
      title: 'Seek to {startTime}',
      timeLabel: 'Transcript cue start time',
      textLabel: 'Transcript cue caption text',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .transcript-cue {
    display: block;
    width: 100%;
    min-width: 200px;
    padding-right: 7px;
    padding-left: 3px;
    white-space: nowrap;
    cursor: pointer;
    border-left: 4px solid transparent;

    .transcript-cue-time,
    .transcript-cue-text {
      display: inline-block;
      padding: 14px 5px;
      white-space: normal;
      vertical-align: top;
    }

    .transcript-cue-time {
      width: 50px;
      font-size: 0.9rem;
    }

    .transcript-cue-text {
      width: calc(100% - 50px);
      border-bottom: 1px solid #dddddd;
    }
  }

</style>
