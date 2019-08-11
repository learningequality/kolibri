<template>

  <span :style="{color: $themeTokens.textDisabled}">—</span>

</template>


<script>

  import KThemeMixin from 'kolibri-components/src/mixins/KThemeMixin';

  export default {
    name: 'KEmptyPlaceholder',
    mixins: [KThemeMixin],
  };

</script>


<style lang="scss" scoped></style>
