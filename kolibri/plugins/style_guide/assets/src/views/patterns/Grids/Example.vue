<template>

  <KFixedGrid numCols="2">
    <KFixedGridItem span="1" class="border">
      A
    </KFixedGridItem>
    <KFixedGridItem span="1" class="border">
      B
    </KFixedGridItem>
  </KFixedGrid>

</template>


<script>

  import KFixedGrid from 'kolibri.shared.KFixedGrid';
  import KFixedGridItem from 'kolibri.shared.KFixedGridItem';

  export default {
    name: 'Example',
    components: {
      KFixedGrid,
      KFixedGridItem,
    },
  };

</script>
