<template>

  <div>
    <KRadioButton
      :value="true"
      :label="coachCommon$tr('entireClassLabel')"
      :currentValue="entireClassIsSelected"
      :disabled="disabled"
      @change="selectEntireClass()"
    />
    <KCheckbox
      v-for="group in groups"
      :key="group.id"
      :label="group.name"
      :checked="groupIsChecked(group.id)"
      :disabled="disabled"
      @change="toggleGroup($event, group.id)"
    />
  </div>

</template>


<script>

  import isEqual from 'lodash/isEqual';
  import KCheckbox from 'kolibri.coreVue.components.KCheckbox';
  import KRadioButton from 'kolibri.coreVue.components.KRadioButton';
  import { coachStringsMixin } from '../../common/commonCoachStrings';

  export default {
    name: 'RecipientSelector',
    components: {
      KCheckbox,
      KRadioButton,
    },
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
    },
    computed: {
      entireClassIsSelected() {
        return isEqual(this.value, [this.classId]);
      },
    },
    methods: {
      groupIsChecked(groupId) {
        return this.value.includes(groupId);
      },
      selectEntireClass() {
        this.$emit('input', [this.classId]);
      },
      toggleGroup(isChecked, id) {
        let newValue;
        if (isChecked) {
          // If a group is selected, remove classId if it is there
          newValue = [...this.value].filter(id => id !== this.classId);
          this.$emit('input', [...newValue, id]);
        } else {
          newValue = [...this.value].filter(groupId => id !== groupId);
          // If un-selecting the last group, auto-select 'Entire Class'
          if (newValue.length === 0) {
            newValue = [this.classId];
          }
          this.$emit('input', newValue);
        }
      },
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
