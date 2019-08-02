<template>

  <KGrid>
    <KGridItem sizes="100, 50, 50">
      <p>
        <slot name="backlink"></slot>
      </p>
    </KGridItem>
    <KGridItem sizes="100, 50, 50" alignment="right" class="pad-button">
      <slot name="options"></slot>
    </KGridItem>
  </KGrid>

</template>


<script>

  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';

  // Lays out a back button on the left with an options button on the right,
  // as used in many different pages
  export default {
    name: 'BackLinkWithOptions',
    components: {
      KGrid,
      KGridItem,
    },
  };

</script>


<style lang="scss" scoped>

  .pad-button {
    padding-top: 16px;
  }

</style>
