<template>

  <KGrid>
    <KGridItem spans="3, 7, 11">
      <h1>
        <KLabeledIcon :icon="contentType" :label="title" />
      </h1>
    </KGridItem>
    <KGridItem spans="1, 1, 1" alignment="right">
      <ProgressIcon class="progress-icon" :progress="progress" />
    </KGridItem>
  </KGrid>

</template>


<script>

  import ProgressIcon from 'kolibri.coreVue.components.ProgressIcon';
  import KLabeledIcon from 'kolibri.coreVue.components.KLabeledIcon';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';

  export default {
    name: 'PageHeader',
    components: {
      KGridItem,
      KGrid,
      KLabeledIcon,
      ProgressIcon,
    },
    props: {
      title: {
        type: String,
      },
      progress: {
        type: Number,
        required: false,
      },
      contentType: {
        type: String,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .progress-icon {
    position: relative;
    top: 20px;
  }

</style>
