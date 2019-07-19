<template>

  <KSelect
    :value="selected"
    :label="UserAccountsStrings.$tr('genderLabel')"
    :placeholder="$tr('placeholder')"
    :options="options"
    :disabled="$attrs.disabled"
    @change="$emit('update:value', $event.value)"
  />

</template>


<script>

  import KSelect from 'kolibri.coreVue.components.KSelect';
  import UserAccountsStrings from './strings';

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
      UserAccountsStrings() {
        return UserAccountsStrings;
      },
      selected() {
        return this.options.find(o => o.value === this.value) || {};
      },
      options() {
        return [
          {
            value: 'MALE',
            label: this.UserAccountsStrings.$tr('genderOptionMale'),
          },
          {
            value: 'FEMALE',
            label: this.UserAccountsStrings.$tr('genderOptionFemale'),
          },
          {
            value: 'OTHER',
            label: this.UserAccountsStrings.$tr('genderOptionOther'),
          },
          {
            value: 'DECLINE',
            label: this.UserAccountsStrings.$tr('preferNotToSayOption'),
          },
        ];
      },
    },
    $trs: {
      placeholder: 'Select gender',
    },
  };

</script>
