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
      :checked="groupIsChecked(group.id)"
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
      :entireClassIsSelected="entireClassIsSelected"
      :initialAdHocLearners="initialAdHocLearners"
      :targetClassId="classId"
      :disabled="disabled"
      @updateLearners="learners => $emit('updateLearners', learners)"
      @togglevisibility="toggleIndividualSelector"
    />
  </div>

</template>


<script>

  import isEqual from 'lodash/isEqual';
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
      // Array of objects, each with 'group' and 'name'
      groups: {
        type: Array,
        required: true,
        validator(value) {
          for (let i = 0; i < value.length; i++) {
            if (!value[i].name || !value[i].id) {
              return false;
            }
          }
          return true;
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
        individualSelectorIsVisible: false,
      };
    },
    computed: {
      entireClassIsSelected() {
        return isEqual(this.value, [this.classId]);
      },
      selectedGroupIds() {
        return this.groups.filter(group => this.groupIsChecked(group.id)).map(group => group.id);
      },
    },
    methods: {
      toggleIndividualSelector(isChecked) {
        this.individualSelectorIsVisible = Boolean(isChecked);
      },
      groupIsChecked(groupId) {
        return this.value.includes(groupId);
      },
      selectEntireClass() {
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
