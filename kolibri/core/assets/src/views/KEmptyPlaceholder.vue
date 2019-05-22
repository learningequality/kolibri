<template>

  <span :style="{color: $themeColors.palette.grey.v_300}">—</span>

</template>


<script>

  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';

  export default {
    name: 'KEmptyPlaceholder',
    mixins: [themeMixin],
  };

</script>


<style lang="scss" scoped></style>
