<template>

  <KGrid>
    <KGridItem
      :layout8="{ span: 4 }"
      :layout12="{ span: 6 }"
    >
      <p>
        <slot name="backlink"></slot>
      </p>
    </KGridItem>
    <KGridItem
      :layout="{ alignment: 'right' }"
      :layout8="{ span: 4 }"
      :layout12="{ span: 6 }"
      class="pad-button"
    >
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
