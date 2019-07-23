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
    name: 'BirthYearDisplayText',
    components: {
      KEmptyPlaceholder,
    },
    props: {
      birthYear: {
        type: String,
      },
    },
    computed: {
      displayText() {
        if (this.birthYear === 'DECLINE') {
          return strings.$tr('preferNotToSayOption');
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
