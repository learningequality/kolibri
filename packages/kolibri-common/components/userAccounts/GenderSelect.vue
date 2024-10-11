<template>

  <KSelect
    :value="selected"
    :label="coreString('genderLabel')"
    :placeholder="$tr('placeholder')"
    :options="options"
    :disabled="$attrs.disabled"
    @change="$emit('update:value', $event.value)"
  />

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { FacilityUserGender } from 'kolibri/constants';

  const { NOT_SPECIFIED, MALE, FEMALE } = FacilityUserGender;

  export default {
    name: 'GenderSelect',
    mixins: [commonCoreStrings],
    props: {
      value: {
        type: String,
        default: null,
      },
    },
    computed: {
      selected() {
        return this.options.find(o => o.value === this.value) || {};
      },
      options() {
        return [
          {
            value: MALE,
            label: this.coreString('genderOptionMale'),
          },
          {
            value: FEMALE,
            label: this.coreString('genderOptionFemale'),
          },
          {
            value: NOT_SPECIFIED,
            label: this.coreString('genderOptionNotSpecified'),
          },
        ];
      },
    },
    $trs: {
      placeholder: {
        message: 'Select gender',
        context:
          "This option allows a user to specify whether their gender is 'Male, Female' or 'Not specified'.",
      },
    },
  };

</script>
