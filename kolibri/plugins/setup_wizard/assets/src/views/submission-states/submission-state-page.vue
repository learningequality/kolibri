<template>

  <div class="submission-state-page">
    <loading-spinner :delay="0" class="submission-state-page-spinner" />

    <h1 class="submission-state-page-header">
      {{ header }}
    </h1>

    <div class="submission-state-page-body">
      <slot></slot>
    </div>

  </div>

</template>


<script>

  import loadingSpinner from 'kolibri.coreVue.components.loadingSpinner';

  export default {
    name: 'submissionStatePage',
    components: { loadingSpinner },
    props: {
      header: {
        type: String,
        required: true,
      },
    },
  };

</script>


<style scoped lang="stylus">

  @require '~kolibri.styles.definitions'

  .submission-state-page
    text-align: center

    &-header
      font-size: 21px
      color: $core-accent-color
      margin-top: 0
      margin-bottom: 24px

    &-body
      font-size: 14px

    &-spinner
      height: 125px // setting to the height of the spinner gif to make the wrapper hug it
      margin-bottom: 40px
      display: inline-block

</style>
