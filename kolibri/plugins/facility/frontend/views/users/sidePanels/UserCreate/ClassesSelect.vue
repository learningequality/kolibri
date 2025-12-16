<template>

  <KSelect
    multiple
    :label="fieldLabel"
    :options="selectOptions"
    :value="selectValue"
    :disabled="disabled"
    :truncateOptionsLabel="false"
    @select="onSelect"
  >
    <template
      v-if="selectValue.length"
      #display
    >
      <span> {{ displayText }} </span>
    </template>
  </KSelect>

</template>


<script>

  import { computed, toRefs } from 'vue';
  import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';

  import { ClassesActions } from '../../../../constants';

  const ALL_VALUE = 'ALL';

  export default {
    name: 'ClassesSelect',
    setup(props, { emit }) {
      const { classes } = toRefs(props);

      const { enrollAClassLabel$, assignToAClassLabel$, enrollToAllClasses$, assignToAllClasses$ } =
        bulkUserManagementStrings;

      const isEnrollingToAClass = computed(() => props.action === ClassesActions.ENROLL_LEARNER);

      const fieldLabel = computed(() => {
        return isEnrollingToAClass.value ? enrollAClassLabel$() : assignToAClassLabel$();
      });

      const allClassesOption = computed(() => ({
        label: isEnrollingToAClass.value ? enrollToAllClasses$() : assignToAllClasses$(),
        value: ALL_VALUE,
      }));

      const selectOptions = computed(() => {
        const classesOptions = classes.value.map(classItem => ({
          label: classItem.name,
          value: classItem.id,
        }));

        classesOptions.sort((a, b) => a.label.localeCompare(b.label));
        classesOptions.unshift(allClassesOption.value);
        return classesOptions;
      });

      const selectValue = computed({
        get() {
          const selectedOptions =
            props.value.map(id => selectOptions.value.find(option => option.value === id)) || [];
          if (selectedOptions.length === classes.value.length) {
            selectedOptions.push(allClassesOption.value);
          }
          return selectedOptions;
        },
        set(value) {
          const newValues = value.map(option => option.value).filter(val => val !== ALL_VALUE);
          emit('input', newValues);
        },
      });

      const displayText = computed(() => {
        const displayValues = selectValue.value.filter(option => option.value !== ALL_VALUE);
        return displayValues.map(option => option.label).join(', ');
      });

      const onSelect = (option, { selected }) => {
        // `selected` represents whether the option is currently selected or not
        const shouldSelect = !selected;
        if (option.value === ALL_VALUE) {
          if (shouldSelect) {
            selectValue.value = selectOptions.value;
          } else {
            selectValue.value = [];
          }
        } else {
          if (shouldSelect) {
            selectValue.value = [...selectValue.value, option];
          } else {
            selectValue.value = selectValue.value.filter(opt => opt.value !== option.value);
          }
        }
      };

      return {
        onSelect,
        fieldLabel,
        selectValue,
        displayText,
        selectOptions,
      };
    },
    props: {
      value: {
        type: Array,
        default: () => [],
      },
      classes: {
        type: Array,
        default: () => [],
      },
      disabled: {
        type: Boolean,
        default: false,
      },
      action: {
        type: String,
        required: true,
        validator: value => Object.values(ClassesActions).includes(value),
      },
    },
  };

</script>


<style lang="scss" scoped>

  .selected-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

</style>
