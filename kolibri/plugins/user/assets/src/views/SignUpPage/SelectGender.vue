<template>

  <KSelect
    :value="selected"
    :label="$tr('label')"
    :placeholder="$tr('placeholder')"
    :options="options"
    :disabled="$attrs.disabled"
    @change="$emit('update:value', $event.value)"
  />

</template>


<script>

  import KSelect from 'kolibri.coreVue.components.KSelect';

  export default {
    name: 'SelectGender',
    components: {
      KSelect,
    },
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
            label: this.$tr('optionMale'),
          },
          {
            value: 'FEMALE',
            label: this.$tr('optionFemale'),
          },
          {
            value: 'OTHER',
            label: this.$tr('optionOther'),
          },
          {
            value: 'DECLINE',
            label: this.$tr('optionDecline'),
          },
        ];
      },
    },
    $trs: {
      label: 'Gender',
      placeholder: 'Select gender',
      optionMale: 'Male',
      optionFemale: 'Female',
      optionOther: 'Other',
      optionDecline: 'Prefer not to say',
    },
  };

</script>
