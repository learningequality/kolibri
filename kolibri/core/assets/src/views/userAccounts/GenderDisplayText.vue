<template>

  <span v-if="displayText">
    {{ displayText }}
  </span>
  <KEmptyPlaceholder v-else />

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'GenderDisplayText',
    mixins: [commonCoreStrings],
    props: {
      gender: {
        type: String,
      },
    },
    computed: {
      displayText() {
        if (this.gender === 'DECLINE') {
          return this.coreString('notSpecifiedOption');
        } else if (this.gender === 'MALE') {
          return this.coreString('genderOptionMale');
        } else if (this.gender === 'FEMALE') {
          return this.coreString('genderOptionFemale');
        } else {
          return '';
        }
      },
    },
  };

</script>


<style lang="scss" scoped></style>
