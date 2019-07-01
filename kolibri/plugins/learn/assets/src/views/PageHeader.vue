<template>

  <h1 dir="auto" class="title">
    <KLabeledIcon>
      <KIcon v-if="contentType" slot="icon" :[iconType]="true" />
      {{ title }}
    </KLabeledIcon>
    <ProgressIcon class="progress-icon" :progress="progress" />
  </h1>

</template>


<script>

  import ProgressIcon from 'kolibri.coreVue.components.ProgressIcon';
  import KIcon from 'kolibri.coreVue.components.KIcon';
  import KLabeledIcon from 'kolibri.coreVue.components.KLabeledIcon';

  export default {
    name: 'PageHeader',
    components: {
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

  .title {
    display: inline-block;
  }

  .progress-icon {
    display: inline-block;
    float: right;
    margin-top: -2px;
    margin-left: 16px;
  }

</style>
