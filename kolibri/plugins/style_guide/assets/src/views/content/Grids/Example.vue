<template>

  <KGrid cols="4">
    <KGridItem size="1" class="border">A</KGridItem>
    <KGridItem size="1" class="border">B</KGridItem>
  </KGrid>

</template>


<script>

  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';

  export default {
    name: 'Example',
    components: {
      KGrid,
      KGridItem,
    },
  };

</script>
