<template>

  <div>
    <h1>{{ $tr('header') }}</h1>
    <p>
      <KExternalLink :text="$tr('adminLink')" href="/device/#/content" />
    </p>
  </div>

</template>


<script>

  import KExternalLink from 'kolibri.coreVue.components.KExternalLink';

  export default {
    name: 'ContentUnavailablePage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      KExternalLink,
    },
    $trs: {
      header: 'No content channels available',
      adminLink: 'You can import content from the Content page if you have the proper permissions',
      documentTitle: 'Content Unavailable',
    },
  };

</script>


<style lang="scss" scoped>

  h1 {
    margin-top: 42px; // height of toolbar
  }

</style>
