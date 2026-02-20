<template>

  <div class="birth-year-range-select">
    <BirthYearSelect
      :value.sync="startYear"
      clearable
      class="birthyear-select"
      :showInfoIcon="false"
      :label="fromLabel$()"
      :excludeNotSpecified="true"
      :invalid="startYearError"
      :invalidText="startYearError"
    />
    <BirthYearSelect
      :value.sync="endYear"
      clearable
      class="birthyear-select"
      :showInfoIcon="false"
      :label="upToLabel$()"
      :excludeNotSpecified="true"
    />
  </div>

</template>


<script>

  import { validateObject } from 'kolibri/utils/objectSpecs';
  import BirthYearSelect from 'kolibri-common/components/userAccounts/BirthYearSelect.vue';
  import { computed } from 'vue';
  import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';

  export default {
    name: 'BirthYearRangeSelect',
    components: {
      BirthYearSelect,
    },
    setup(props, { emit }) {
      const { fromLabel$, upToLabel$ } = bulkUserManagementStrings;
      const startYear = computed({
        get: () => props.value.start,
        set: value => {
          emit('input', { ...props.value, start: value });
        },
      });
      const endYear = computed({
        get: () => props.value.end,
        set: value => {
          emit('input', { ...props.value, end: value });
        },
      });
      const startYearError = computed(() => {
        if (startYear.value && endYear.value && startYear.value > endYear.value) {
          return bulkUserManagementStrings.birthYearRangeError$();
        }
        return null;
      });
      return {
        startYear,
        endYear,
        startYearError,
        fromLabel$,
        upToLabel$,
      };
    },
    props: {
      value: {
        type: Object,
        required: true,
        validator: value =>
          validateObject(value, {
            start: {
              type: String,
              required: false,
              default: null,
            },
            end: {
              type: String,
              required: false,
              default: null,
            },
          }),
      },
    },
  };

</script>


<style lang="scss" scoped>

  .birth-year-range-select {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;

    .birthyear-select {
      min-width: 100%;
    }
  }

</style>
