<template>

  <div class="submission-state-page">
    <KCircularLoader
      class="submission-state-page-spinner"
      :delay="false"
    />

    <h1 class="submission-state-page-header">
      {{ header }}
    </h1>

    <div class="submission-state-page-body">
      <slot></slot>
    </div>

  </div>

</template>


<script>

  import KCircularLoader from 'kolibri.coreVue.components.KCircularLoader';

  export default {
    name: 'SubmissionStatePage',
    components: { KCircularLoader },
    props: {
      header: {
        type: String,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .submission-state-page {
    text-align: center;
  }

  .submission-state-page-header {
    margin-top: 0;
    margin-bottom: 24px;
    font-size: 21px;
    color: $core-accent-color;
  }

  .submission-state-page-body {
    font-size: 14px;
  }

  .submission-state-page-spinner {
    display: inline-block;
    height: 32px; // setting to the height of the spinner to make the wrapper hug it
    margin-bottom: 40px;
  }

</style>
