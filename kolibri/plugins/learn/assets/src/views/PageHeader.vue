<template>

  <KGrid>
    <KGridItem sizes="3, 7, 11">
      <h1>
        <KLabeledIcon>
          <KIcon v-if="contentType" slot="icon" :[iconType]="true" />
          {{ title }}
        </KLabeledIcon>
      </h1>
    </KGridItem>
    <KGridItem sizes="1, 1, 1" alignment="right">
      <ProgressIcon class="progress-icon" :progress="progress" />
    </KGridItem>
  </KGrid>

</template>


<script>

  import ProgressIcon from 'kolibri.coreVue.components.ProgressIcon';
  import KIcon from 'kolibri.coreVue.components.KIcon';
  import KLabeledIcon from 'kolibri.coreVue.components.KLabeledIcon';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';

  export default {
    name: 'PageHeader',
    components: {
      KGridItem,
      KGrid,
      KIcon,
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
    computed: {
      iconType() {
        if (this.contentType === 'document') {
          return 'doc';
        }
        return this.contentType;
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
