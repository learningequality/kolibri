<template>

  <KGrid>
    <KGridItem
      :layout4="{ span: 3 }"
      :layout8="{ span: 7 }"
      :layout12="{ span: 11 }"
    >
      <h1>
        <KLabeledIcon
          :icon="contentType"
          :label="title"
        />
      </h1>
    </KGridItem>
    <KGridItem :layout="{ span: 1, alignment: 'right' }">
      <ProgressIcon
        class="progress-icon"
        :progress="progress"
      />
    </KGridItem>
  </KGrid>

</template>


<script>

  import ProgressIcon from 'kolibri-common/components/labels/ProgressIcon';

  export default {
    name: 'PageHeader',
    components: {
      ProgressIcon,
    },
    props: {
      title: {
        type: String,
        default: null,
      },
      progress: {
        type: Number,
        default: null,
      },
      contentType: {
        type: String,
        default: null,
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
