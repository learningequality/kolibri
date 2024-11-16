<template>

  <div
    class="activity-chip"
    :style="{ backgroundColor: $themePalette.grey.v_200 }"
  >
    <KLabeledIcon
      :label="coreString(kind)"
      class="activity-chip-label"
    >
      <template #icon>
        <LearningActivityIcon :kind="kind" />
      </template>
    </KLabeledIcon>
  </div>

</template>


<script>

  import { LearningActivities } from 'kolibri/constants';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import LearningActivityIcon from 'kolibri-common/components/ResourceDisplayAndSearch/LearningActivityIcon.vue';

  /**
   * Wraps LearningActivityIcon in KLabeledIcon
   */
  export default {
    name: 'LearningActivityChip',
    components: { LearningActivityIcon },
    mixins: [commonCoreStrings],
    props: {
      /**
       * Learning activity constant(s)
       * Can be one constant or an array of constants
       */
      kind: {
        type: String,
        required: true,
        validator(value) {
          return Object.values(LearningActivities).includes(value);
        },
      },
    },
  };

</script>


<style lang="scss" scoped>

  .activity-chip {
    display: inline-block;
    padding: 12px;
    font-weight: bold;
    border-radius: 4px;

    /deep/ svg {
      width: 24px;
      height: 24px;
      margin-top: -4px;
      margin-left: -2px;
    }
  }

  .activity-chip-label {
    width: auto;
  }

</style>
