<template>

  <div class="onboarding-loading-wrapper">
    <div class="onboarding-loading">
      <loading-spinner :custom-styles="true" :delay="0" class="onboarding-loading-spinner" />
      <h1 class="onboarding-loading-header">
        {{ $tr('loadingPageHeader') }}
      </h1>

      <span class="onboarding-loading-subheader">
        {{ $tr('loadingPageSubheader') }}
      </span>
    </div>
  </div>

</template>


<script>

  import loadingSpinner from 'kolibri.coreVue.components.loadingSpinner';

  export default {
    name: 'SetupLoadingPage',
    $trs: {
      loadingPageHeader: 'Setting up your facility...',
      loadingPageSubheader: 'Please be patient. Setup may take several minutes',
    },
    components: { loadingSpinner },
  };

</script>


<style scoped lang="stylus">

  @require '~kolibri.styles.definitions'

  .onboarding-loading
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
      margin-bottom: 21px

    &-subheader
      font-size: 14px

    &-spinner
      width: 185px
      height: 185px
      margin-bottom: 40px
      display: inline-block

</style>