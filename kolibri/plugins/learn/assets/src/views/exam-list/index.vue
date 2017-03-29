<template>

  <div>
    <page-header :title="$tr('examName')">
      <mat-svg slot="icon" category="action" name="home"/>
    </page-header>
  </div>

</template>


<script>

  module.exports = {
    $trNameSpace: 'examIndex',
    $trs: {
      examName: 'Exams',
    },
    components: {
      'page-header': require('../page-header'),
    },
    vuex: {
      getters: {
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
