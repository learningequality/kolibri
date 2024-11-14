<template>

  <KSelect
    :label="description"
    :value="optionValue"
    :options="options"
    :disabled="disabled"
    @select="emitSelectEvent"
  />

</template>


<script>

  import { currentLanguage } from 'kolibri/utils/i18n';

  function getTranslatedString(spec) {
    return (spec.translations || {})[currentLanguage];
  }

  export default {
    name: 'ExtraDemographicField',
    props: {
      field: {
        type: Object,
        required: true,
      },
      value: {
        type: String,
        required: true,
      },
      disabled: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      options() {
        if (!this.field?.enumValues) {
          return [];
        }
        return this.field.enumValues.map(option => ({
          value: option.value,
          label: getTranslatedString(option) || option.defaultLabel,
        }));
      },
      optionValue() {
        return this.options.find(option => option.value === this.value) || {};
      },
      description() {
        if (!this.field) {
          return '';
        }
        return getTranslatedString(this.field) || this.field.description;
      },
    },
    methods: {
      emitSelectEvent(option) {
        this.$emit('select', option.value);
      },
    },
  };

</script>
