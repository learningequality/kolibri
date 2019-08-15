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

  import KSelect from 'kolibri.coreVue.components.KSelect';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'GenderSelect',
    components: {
      KSelect,
    },
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
            value: 'MALE',
            label: this.coreString('genderOptionMale'),
          },
          {
            value: 'FEMALE',
            label: this.coreString('genderOptionFemale'),
          },
          {
            value: 'DECLINE',
            label: this.coreString('notSpecifiedOption'),
          },
        ];
      },
    },
    $trs: {
      placeholder: 'Select gender',
    },
  };

</script>
