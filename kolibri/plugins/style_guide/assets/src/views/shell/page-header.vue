<template>

  <div class="page-header">
    <h1 v-on:click="goHome">
        Kolibri Style Guide
    </h1>
  </div>

</template>


<script>

  import router from 'kolibri.coreVue.router';

  export default {
    methods: {
      goHome() {
        router.getInstance().replace({ path: '/style_guide/' });
      },
    },
  };

</script>


<style lang="stylus">

  @import '../../styles/core-theme.styl'

  .page-header
    background: #996189
    color: white

    height: $page-header-height
    line-height: $page-header-height
    padding-left: $nav-padding-left

    position: fixed
    left: 0
    right: 0
    top: 0
    z-index: 999

    h1
      margin: 0
      font-size: 1.125em
      font-weight: 500
      display: inline
      cursor: pointer

</style>
