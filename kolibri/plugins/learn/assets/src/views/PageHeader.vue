<template>

  <div dir="auto">
    <h1 class="title">
      <KLabeledIcon>
        <KIcon slot="icon" :[iconType]="true" />
        {{ title }}
      </KLabeledIcon>
      <ProgressIcon class="progress-icon" :progress="progress" />
    </h1>
  </div>

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
      // eslint-disable-next-line
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
    margin-left: 16px;
  }

</style>
