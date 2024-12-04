<template>

  <div>
    <!-- Entire class -->
    <KRadioButtonGroup>
      <KRadioButton
        :buttonValue="true"
        :currentValue="entireClassIsSelected"
        :disabled="disabled"
        @change="selectEntireClass()"
      >
        <KLabeledIcon
          :label="coachString('entireClassLabel')"
          icon="classes"
        />
      </KRadioButton>
    </KRadioButtonGroup>
    <!-- Learner groups -->
    <KCheckbox
      v-for="group in groups"
      :key="group.id"
      :checked="groupIsSelected(group)"
      :disabled="disabled"
      @change="toggleGroup($event, group)"
    >
      <KLabeledIcon
        :label="group.name"
        icon="group"
      />
    </KCheckbox>

    <!-- Individual learners -->
    <IndividualLearnerSelector
      :isVisible="individualSelectorIsVisible"
      :selectedGroupIds="selectedGroupIds"
      :selectedLearnerIds.sync="selectedLearnerIds"
      :targetClassId="classId"
      :disabled="disabled"
      @togglevisibility="toggleIndividualSelector"
    />
  </div>

</template>


<script>

  import every from 'lodash/every';
  import { coachStringsMixin } from '../../common/commonCoachStrings';
  import IndividualLearnerSelector from './IndividualLearnerSelector';

  export default {
    name: 'RecipientSelector',
    components: { IndividualLearnerSelector },
    mixins: [coachStringsMixin],
    props: {
      // Needs to equal [classId] if entire class is selected
      // Otherwise, [groupId_1, groupId_2] for individual Learner Groups
      value: {
        type: Array,
        required: true,
      },
      // Array of objects, each with (group) 'id' and 'name'
      groups: {
        type: Array,
        required: true,
        validator(value) {
          return every(value, val => val.name && val.id);
        },
      },
      // For the 'Entire Class' option
      classId: {
        type: String,
        required: true,
      },
      disabled: {
        type: Boolean,
        default: false,
      },
      initialAdHocLearners: {
        type: Array,
        required: false,
        default: new Array(),
      },
    },
    data() {
      return {
        // Determines whether the individual learner table is visible.
        // Is initially open if item is assigned to individuals.
        individualSelectorIsVisible: this.initialAdHocLearners.length > 0,
        // This is .sync'd with IndividualLearnerSelector, but not with AssignmentDetailsModal
        // which recieves updates via handler in watch.selectedLearnerIds
        selectedLearnerIds: [...this.initialAdHocLearners],
        // Determines whether the group's checkbox is checked and affects which
        // learners are selectable in IndividualLearnerSelector
        selectedGroupIds: this.value.filter(id => id !== this.classId),
      };
    },
    computed: {
      entireClassIsSelected() {
        return this.selectedLearnerIds.length === 0 && this.selectedGroupIds.length === 0;
      },
      currentCollectionIds() {
        if (this.entireClassIsSelected) {
          return [this.classId];
        } else {
          return this.selectedGroupIds;
        }
      },
    },
    watch: {
      selectedLearnerIds(newVal) {
        this.$emit('updateLearners', newVal);
      },
      currentCollectionIds(newVal) {
        this.$emit('input', newVal);
      },
    },
    methods: {
      toggleIndividualSelector(isChecked) {
        if (!isChecked) {
          this.clearLearnerIds();
        } else {
          this.individualSelectorIsVisible = true;
        }
      },
      groupIsSelected({ id }) {
        return this.value.includes(id);
      },
      clearLearnerIds() {
        this.selectedLearnerIds = [];
        this.individualSelectorIsVisible = false;
      },
      selectEntireClass() {
        this.clearLearnerIds();
        this.selectedGroupIds = [];
      },
      toggleGroup(isChecked, { id }) {
        if (isChecked) {
          this.selectedGroupIds.push(id);
        } else {
          this.selectedGroupIds = this.selectedGroupIds.filter(groupId => groupId !== id);
        }
      },
    },
  };

</script>


<style lang="scss" scoped></style>
