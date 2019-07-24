<template>

  <span v-if="displayText">
    {{ displayText }}
  </span>
  <KEmptyPlaceholder v-else />

</template>


<script>

  import KEmptyPlaceholder from 'kolibri.coreVue.components.KEmptyPlaceholder';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'GenderDisplayText',
    components: {
      KEmptyPlaceholder,
    },
    mixins: [commonCoreStrings],
    props: {
      gender: {
        type: String,
      },
    },
    computed: {
      displayText() {
        if (this.gender === 'DECLINE') {
          return this.coreString('preferNotToSayOption');
        } else if (this.gender === 'MALE') {
          return this.coreString('genderOptionMale');
        } else if (this.gender === 'FEMALE') {
          return this.coreString('genderOptionFemale');
        } else if (this.gender === 'OTHER') {
          return this.coreString('genderOptionOther');
        } else {
          return '';
        }
      },
    },
  };

</script>


<style lang="scss" scoped></style>
