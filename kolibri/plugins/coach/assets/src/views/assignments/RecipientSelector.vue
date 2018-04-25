<template>

  <div>
    <k-radio-button
      :value="true"
      :label="$tr('entireClass')"
      :currentValue="entireClassIsSelected"
      @change="selectEntireClass()"
      :disabled="disabled"
    />
    <k-checkbox
      v-for="group in groups"
      :key="group.id"
      :label="group.name"
      :checked="groupIsChecked(group.id)"
      @change="toggleGroup($event, group.id)"
      :disabled="disabled"
    />
  </div>

</template>


<script>

  import isEqual from 'lodash/isEqual';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kCheckbox from 'kolibri.coreVue.components.kCheckbox';
  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';

  export default {
    name: 'recipientSelector',
    components: {
      kButton,
      kCheckbox,
      kRadioButton,
    },
    props: {
      // Needs to equal [classId] if entire class is selected
      // Otherwise, [groupId_1, groupId_2] for individual Learner Groups
      value: {
        type: Array,
        required: true,
      },
      groups: {
        type: Array,
        required: true,
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
    $trs: {
      entireClass: 'Entire class',
    },
  };

</script>


<style lang="stylus" scoped></style>
