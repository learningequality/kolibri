<template>

  <div>
    <breadcrumbs :items="items"/>
  </div>

</template>


<script>

  module.exports = {
    components: {
      breadcrumbs: require('./breadcrumbs'),
    },
    computed: {
      items() {
        return [
          {
            text: 'Decimals (CK-12)',
            link: '#'
          },
          {
            text: 'Combinations of Decimal Money Amounts',
            link: '#'
          },
          {
            text: 'Adding and subtracting fractions with like denominators',
            link: '#'
          },
          {
            text: 'Dividing unit fractions and whole numbers',
            link: '#'
          },
        ];
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

</style>
