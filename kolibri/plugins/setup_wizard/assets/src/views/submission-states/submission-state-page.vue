<template>

  <div class="submission-state-page-wrapper">
    <div class="submission-state-page">
      <loading-spinner :custom-styles="true" :delay="0" class="submission-state-page-spinner" />

      <h1 class="submission-state-page-header">
        {{ header }}
      </h1>

      <div class="submission-state-page-body">
        <slot />
      </div>

    </div>
  </div>

</template>


<script>

  import loadingSpinner from 'kolibri.coreVue.components.loadingSpinner';

  export default {
    name: 'submissionStatePage',
    props: {
      header: {
        type: String,
        required: true,
      },
    },
    components: { loadingSpinner },
  };

</script>


<style scoped lang="stylus">

  @require '~kolibri.styles.definitions'

  .submission-state-page
    position: absolute
    left: 50%
    top: 50%
    transform: translate(-50%, -50%)

    &-wrapper
      width: 100%
      height: 100vh
      text-align: center
      position: relative

    &-header
      font-size: 21px
      color: $core-accent-color
      margin-bottom: 24px

    &-body
      font-size: 14px

    &-spinner
      width: 185px
      height: 185px
      margin-bottom: 40px
      display: inline-block

</style>