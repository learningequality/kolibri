<template>

  <div>
    <!-- Main checkbox -->
    <KCheckbox
      key="adHocLearners"
      :checked="isVisible"
      :disabled="disabled"
      @change="$emit('togglevisibility', $event)"
    >
      <KLabeledIcon
        icon="people"
        :label="coachString('individualLearnersLabel')"
      />
    </KCheckbox>

    <!-- Paginated list of learners -->
    <div v-if="isVisible">
      <div class="table-title">
        {{ $tr('selectedIndividualLearnersLabel') }}
      </div>
      <div class="table-description">
        {{ coachString('onlyShowingEnrolledLabel') }}
      </div>

      <IndividualLearnerSelectorTable
        :selectedGroupIds="selectedGroupIds"
        :selectedLearnerIds="selectedLearnerIds"
        :targetClassId="targetClassId"
        :disabled="disabled"
        @update:selectedLearnerIds="$emit('update:selectedLearnerIds', $event)"
      />
    </div>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import commonCoachStrings from '../../../common';
  import IndividualLearnerSelectorTable from './IndividualLearnerSelectorTable';

  export default {
    name: 'IndividualLearnerSelector',
    components: { IndividualLearnerSelectorTable },
    mixins: [commonCoreStrings, commonCoachStrings],
    props: {
      // If true, the main checkbox is checked and the list of learners is shown
      isVisible: {
        type: Boolean,
        required: true,
      },
      // Used to disable learner rows if already assigned via learner group
      selectedGroupIds: {
        type: Array,
        required: true,
      },
      // List of selected learner IDs (must be .sync'd with parent form)
      selectedLearnerIds: {
        type: Array,
        required: true,
      },
      // Disables the entire form
      disabled: {
        type: Boolean,
        required: true,
        default: false,
      },
      // Only given when not used in current class context
      targetClassId: {
        type: String,
        required: false,
        default: null,
      },
    },
    $trs: {
      selectedIndividualLearnersLabel: {
        message: 'Select individual learners',
        context:
          'A bolded header for the table where a Coach will select individual learners who will have access to a quiz.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  fieldset {
    padding: 0;
    margin: 24px 0;
    border: 0;
  }

  .table-title {
    margin: 16px 0;
    font-size: 16px;
    font-weight: bold;
  }

  .table-header {
    padding: 24px 0;
  }

  .table-checkbox-header {
    padding: 8px;
  }

  .hidden-learners-tooltip {
    padding: 0 8px;
  }

  .table-description {
    margin-bottom: 8px;
    font-size: 16px;
  }

  .table-data {
    padding-top: 6px;
    vertical-align: middle;
  }

  .filter-input {
    margin-top: 16px;
  }

</style>
