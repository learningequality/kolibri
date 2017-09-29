<template>

  <div>
    <h1>{{ $tr('header') }}</h1>
    <p><a href="/management/device#/content">{{ $tr('adminLink') }}</a></p>
  </div>

</template>


<script>

  export default {
    name: 'learnContentUnavailable',
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
