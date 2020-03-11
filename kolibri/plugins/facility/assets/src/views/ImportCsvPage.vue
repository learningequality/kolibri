<template>

  <KPageContainer>
    Hello
  </KPageContainer>

</template>


<script>

  export default {
    name: 'ImportCsvPage',
    metaInfo() {
      return {
        title: this.$tr('pageHeader'),
      };
    },
    $trs: {
      pageHeader: 'Import data from CSV',
    },
  };

</script>


<style lang="scss" scoped></style>
