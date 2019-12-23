<template>

  <a
    role="button"
    tabindex="0"
    :class="[
      'transcript-cue',
      { active },
      $computedClass(style)
    ]"
    :title="$tr('title', { startTime })"
    :aria-current="active.toString()"
    @click="triggerSeekEvent"
    @keypress.enter="triggerSeekEvent"
    @keypress.space="triggerSeekEvent"
    @keydown.home.prevent="$emit('goTo', 'beginning')"
    @keydown.end.prevent="$emit('goTo', 'end')"
  >
    <span
      class="transcript-cue-time"
      :aria-label="$tr('timeLabel')"
      :style="timeStyle"
    >{{ startTime }}</span>
    <span
      class="transcript-cue-text"
      :aria-label="$tr('textLabel')"
      :style="textStyle"
    >
      <strong v-if="speaker">{{ speaker }}</strong>
      {{ text }}
    </span>
  </a>

</template>


<script>

  import videojs from 'video.js';

  const SPEAKER_REGEX = /<v ([^>]+)>/i;

  export default {
    name: 'TranscriptCue',
    props: {
      cue: Object,
      mediaDuration: Number,
      active: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      speaker() {
        return this.cue.text.match(SPEAKER_REGEX)
          ? this.cue.text.replace(SPEAKER_REGEX, '$1')
          : null;
      },
      startTime() {
        return videojs.formatTime(this.cue.startTime, this.mediaDuration);
      },
      style() {
        const activeStyles = this.active
          ? {
              backgroundColor: this.$themePalette.grey.v_300,
              borderLeftColor: this.$themeTokens.video,
            }
          : {};

        return Object.assign(activeStyles, {
          ':hover': {
            backgroundColor: this.$themePalette.grey.v_200,
          },
          ':focus': this.$coreOutline,
        });
      },
      text() {
        return this.cue.text.replace(SPEAKER_REGEX, '');
      },
      textStyle() {
        return {
          'border-color': this.$themeTokens.fineLine,
        };
      },
      timeStyle() {
        return {
          color: this.$themeTokens.annotation,
        };
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
      duration() {
        return this.cue.endTime - this.cue.startTime;
      },
      /**
       * @public
       */
      height() {
        return this.$el.offsetHeight;
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
      focus() {
        return this.$el.focus();
      },
    },
    $trs: {
      title: 'Seek to {startTime}',
      timeLabel: 'Transcript cue start time',
      textLabel: {
        message: 'Transcript cue caption text',
        context:
          '\nThis string is used to describe the container where the caption appears to help those using screen readers assistive technology.\n\nYou could also translate it as "Text of the current caption".\n\n\n',
      },
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

    &.active {
      font-weight: bold;
    }

    .transcript-cue-time,
    .transcript-cue-text {
      display: inline-block;
      padding: 14px 5px;
      white-space: normal;
      vertical-align: top;
    }

    .transcript-cue-time {
      width: 50px;
      margin-top: 0.1rem;
      font-size: 0.9rem;
    }

    .transcript-cue-text {
      width: calc(100% - 50px);
      border-bottom: 1px solid transparent;
    }
  }

</style>
