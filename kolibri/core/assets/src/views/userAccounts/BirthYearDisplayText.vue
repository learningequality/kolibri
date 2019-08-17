<template>

  <span v-if="displayText">
    {{ displayText }}
  </span>
  <KEmptyPlaceholder v-else />

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'BirthYearDisplayText',
    mixins: [commonCoreStrings],
    props: {
      birthYear: {
        type: String,
      },
    },
    computed: {
      displayText() {
        if (this.birthYear === 'DECLINE') {
          return this.coreString('notSpecifiedOption');
        } else if (this.birthYear !== 'DEFER') {
          return this.birthYear;
        } else {
          return '';
        }
      },
    },
  };

</script>


<style lang="scss" scoped></style>
