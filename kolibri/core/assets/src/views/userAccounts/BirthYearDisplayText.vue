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
    name: 'BirthYearDisplayText',
    components: {
      KEmptyPlaceholder,
    },
    mixins: [commonCoreStrings],
    props: {
      birthYear: {
        type: String,
      },
    },
    computed: {
      displayText() {
        if (this.birthYear === 'DECLINE') {
          return this.coreString('preferNotToSayOption');
        } else if (this.birthYear) {
          return this.birthYear;
        } else {
          return '';
        }
      },
    },
  };

</script>


<style lang="scss" scoped></style>
