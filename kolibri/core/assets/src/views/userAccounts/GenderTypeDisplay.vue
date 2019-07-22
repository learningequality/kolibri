<template>

  <span v-if="displayText">
    {{ displayText }}
  </span>
  <KEmptyPlaceholder v-else />

</template>


<script>

  import KEmptyPlaceholder from 'kolibri.coreVue.components.KEmptyPlaceholder';
  import strings from './strings';

  export default {
    name: 'GenderTypeDisplay',
    components: {
      KEmptyPlaceholder,
    },
    props: {
      gender: {
        type: String,
      },
    },
    computed: {
      displayText() {
        if (this.gender === 'DECLINE') {
          return strings.$tr('preferNotToSayOption');
        } else if (this.gender === 'MALE') {
          return strings.$tr('genderOptionMale');
        } else if (this.gender === 'FEMALE') {
          return strings.$tr('genderOptionFemale');
        } else if (this.gender === 'OTHER') {
          return strings.$tr('genderOptionOther');
        } else {
          return '';
        }
      },
    },
  };

</script>


<style lang="scss" scoped></style>
