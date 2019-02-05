<template>

  <span :style="{color: $coreGrey300}">—</span>

</template>


<script>

  import { mapGetters } from 'vuex';

  export default {
    name: 'KEmptyPlaceholder',
    computed: {
      ...mapGetters(['$coreGrey300']),
    },
  };

</script>


<style lang="scss" scoped></style>
