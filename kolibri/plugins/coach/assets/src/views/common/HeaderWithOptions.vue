<template>

  <KGrid>
    <KGridItem
      :layout4="{ span: 4 }"
      :layout8="{ span: 5 }"
      :layout12="{ span: 8 }"
    >
      <slot name="header"></slot>
    </KGridItem>
    <KGridItem
      v-show="!$isPrint"
      :layout="{ alignment: 'right' }"
      :layout4="{ alignment: 'left', span: 4 }"
      :layout8="{ span: 3 }"
      :layout12="{ span: 4 }"
      class="pad-button"
    >
      <slot name="options"></slot>
    </KGridItem>
  </KGrid>

</template>


<script>

  // Lays out a back button on the left with an options button on the right,
  // as used in many different pages
  export default {
    name: 'HeaderWithOptions',
  };

</script>


<style lang="scss" scoped>

  .pad-button {
    padding-top: 16px;
  }

</style>
