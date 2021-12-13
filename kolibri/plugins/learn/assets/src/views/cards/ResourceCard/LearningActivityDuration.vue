<template>

  <span>
    <template v-if="isReference">
      {{ ReferenceLabel }}
    </template>
    <TimeDuration
      v-else-if="displayPreciseDuration"
      :seconds="durationInSeconds"
    />
    <template v-else>
      {{ durationEstimation }}
    </template>
  </span>

</template>


<script>

  import TimeDuration from 'kolibri.coreVue.components.TimeDuration';
  import useLearningActivities from '../../../composables/useLearningActivities';

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
        durationInSeconds,
        durationEstimation,
      } = useLearningActivities(props.contentNode);

      return {
        ReferenceLabel,
        isReference,
        displayPreciseDuration,
        durationInSeconds,
        durationEstimation,
      };
    },
    props: {
      // eslint-disable-next-line kolibri/vue-no-unused-properties
      contentNode: {
        type: Object,
        required: true,
      },
    },
  };

</script>
