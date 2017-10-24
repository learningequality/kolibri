<template>

  <div>
    <h1>{{ $tr('header') }}</h1>
    <p>
      <k-external-link :text="$tr('adminLink')" href="/management/device#/content" />
    </p>
  </div>

</template>


<script>

  import kExternalLink from 'kolibri.coreVue.components.kExternalLink';

  export default {
    name: 'learnContentUnavailable',
    components: {
      kExternalLink,
    },
    $trs: {
      header: 'No content channels available',
      adminLink: 'You can import content from the Content page if you have the proper permissions',
    },
  };

</script>


<style lang="stylus" scoped>

  h1
    margin-top: 42px // height of toolbar

</style>
