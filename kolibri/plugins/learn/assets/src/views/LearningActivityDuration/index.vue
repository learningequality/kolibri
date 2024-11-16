<template>

  <span
    v-if="isReference || displayPreciseDuration || displayEstimatedDuration || exerciseDescription"
    :class="[appearance === 'chip' ? 'chip' : '']"
    :style="[
      appearance === 'chip'
        ? { color: $themeTokens.textInverted, backgroundColor: $themePalette.black }
        : {},
    ]"
  >
    <template v-if="isReference">
      {{ ReferenceLabel }}
    </template>
    <TimeDuration
      v-else-if="displayPreciseDuration"
      :seconds="durationInSeconds"
    />
    <template v-else-if="displayEstimatedDuration">
      {{ durationEstimation }}
    </template>
    <template v-else-if="exerciseDescription">
      {{ exerciseDescription }}
    </template>
  </span>

</template>


<script>

  import TimeDuration from 'kolibri-common/components/TimeDuration';
  import useLearningActivities from '../../composables/useLearningActivities';

  /**
   * Depending on learning activities and duration of the content node,
   * shows precise time duration or its textual estimation:
   *
   * 1. For audio and video - time is displayed
   * 2. For read - 'Reference' is displayed
   * 3. For all other learning activities - 'Short activity' is displayed
   *    for activities no longer than 30 minutes and 'Long activity'
   *    is displayed for activities longer than 30 minutes
   */
  export default {
    name: 'LearningActivityDuration',
    components: {
      TimeDuration,
    },
    setup(props) {
      const {
        ReferenceLabel,
        isReference,
        displayPreciseDuration,
        displayEstimatedDuration,
        durationInSeconds,
        durationEstimation,
        exerciseDescription,
      } = useLearningActivities(props.contentNode);

      return {
        ReferenceLabel,
        isReference,
        displayPreciseDuration,
        displayEstimatedDuration,
        durationInSeconds,
        durationEstimation,
        exerciseDescription,
      };
    },
    props: {
      // eslint-disable-next-line vue/no-unused-properties
      contentNode: {
        type: Object,
        required: true,
      },
      /**
       * `text` - duration is rendered as plain text
       * `chip` - duration is displayed in the dark gray chip
       */
      appearance: {
        type: String,
        required: false,
        default: 'text',
        validator: value => {
          return ['text', 'chip'].includes(value);
        },
      },
    },
  };

</script>


<style lang="scss" scoped>

  .chip {
    padding: 8px;
    font-size: 13px;
    border-radius: 4px;
    opacity: 0.7;
  }

</style>
