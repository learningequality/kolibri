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

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { FacilityUserGender } from 'kolibri.coreVue.vuex.constants';

  const { NOT_SPECIFIED, MALE, FEMALE } = FacilityUserGender;

  export default {
    name: 'GenderSelect',
    mixins: [commonCoreStrings],
    props: {
      value: {
        type: String,
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
      placeholder: 'Select gender',
    },
  };

</script>
