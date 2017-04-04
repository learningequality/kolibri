<template>

  <div>
    <span v-if="date">{{ $tr('date', [date]) }}</span>
    <span v-else>–</span>
  </div>

</template>


<script>

  module.exports = {
    $trNameSpace: 'dateCell',
    $trs: {
      date: '{0, date, medium}',
    },
    props: {
      date: { type: Date },
    },
  };

</script>


<style lang="stylus" scoped></style>
