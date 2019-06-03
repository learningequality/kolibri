<template>

  <span :style="{color: $themeTokens.textDisabled}">—</span>

</template>


<script>

  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';

  export default {
    name: 'KEmptyPlaceholder',
    mixins: [themeMixin],
  };

</script>


<style lang="scss" scoped></style>
