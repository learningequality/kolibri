<template>

  <div>
    <ExtraDemographicField
      v-for="field in customSchema"
      :key="field.id"
      :field="field"
      :value="(value || {})[field.id] || ''"
      :disabled="disabled"
      @select="v => setInput(field.id, v)"
    />
  </div>

</template>


<script>

  import isPlainObject from 'lodash/isPlainObject';
  import isNull from 'lodash/isNull';
  import ExtraDemographicField from './ExtraDemographicField';

  export default {
    name: 'ExtraDemographics',
    components: {
      ExtraDemographicField,
    },
    props: {
      value: {
        required: true,
        validator: o => isNull(o) || isPlainObject(o),
      },
      facilityDatasetExtraFields: {
        type: Object,
        required: true,
      },
      disabled: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      customSchema() {
        return this.facilityDatasetExtraFields?.demographic_fields || [];
      },
    },
    methods: {
      setInput(key, value) {
        this.$emit('input', {
          ...this.value,
          [key]: value,
        });
      },
    },
  };

</script>
