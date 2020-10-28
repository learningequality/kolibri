<template>

  <div>
    <!-- Entire class -->
    <KRadioButton
      :value="true"
      :currentValue="entireClassIsSelected"
      :disabled="disabled"
      @change="selectEntireClass()"
    >
      <KLabeledIcon
        :label="coachString('entireClassLabel')"
        icon="classes"
      />
    </KRadioButton>

    <!-- Learner groups -->
    <KCheckbox
      v-for="group in groups"
      :key="group.id"
      :checked="groupIdIsSelected(group.id)"
      :disabled="disabled"
      @change="toggleGroup($event, group.id)"
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

  import isEqual from 'lodash/isEqual';
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
        individualSelectorIsVisible: this.initialAdHocLearners.length > 0,
        // This is .sync'd with IndividualLearnerSelector, but not with AssignmentDetailsModal
        // which recieves updates via handler in watch.selectedLearnerIds
        selectedLearnerIds: [...this.initialAdHocLearners],
      };
    },
    computed: {
      entireClassIsSelected() {
        return this.selectedLearnerIds.length === 0 && isEqual(this.value, [this.classId]);
      },
      selectedGroupIds() {
        return this.groups.filter(group => this.groupIdIsSelected(group.id)).map(group => group.id);
      },
    },
    watch: {
      selectedLearnerIds(newVal) {
        this.$emit('updateLearners', newVal);
      },
    },
    methods: {
      toggleIndividualSelector(isChecked) {
        if (!isChecked) {
          this.closeIndividualSelector();
        } else {
          this.individualSelectorIsVisible = true;
        }
      },
      groupIdIsSelected(groupId) {
        return this.value.includes(groupId);
      },
      closeIndividualSelector() {
        this.selectedLearnerIds = [];
        this.individualSelectorIsVisible = false;
      },
      selectEntireClass() {
        this.closeIndividualSelector();
        this.$emit('input', [this.classId]);
      },
      toggleGroup(isChecked, newId) {
        let newValue;
        if (isChecked) {
          // If a group is selected, remove classId if it is there
          newValue = this.value.filter(id => id !== this.classId);
          if (newId) {
            newValue.push(newId);
          }
        } else {
          newValue = this.value.filter(groupId => newId !== groupId);
          // If un-selecting the last group, auto-select 'Entire Class'
          if (newValue.length === 0) {
            newValue = [this.classId];
          }
        }
        this.$emit('input', newValue);
      },
    },
  };

</script>


<style lang="scss" scoped></style>
