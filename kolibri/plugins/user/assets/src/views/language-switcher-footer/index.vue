<template>

  <div class="footer-wrapper">
    <language-switcher-list class="list" />
  </div>

</template>


<script>

  import languageSwitcherList from 'kolibri.coreVue.components.languageSwitcherList';

  export default {
    name: 'languageSwitcherFooter',
    components: {
      languageSwitcherList,
    },
  };

</script>


<style lang="stylus" scoped>

  .footer-wrapper
    margin-left: 36px
    margin-right: 36px
    text-align: center

  .list
    display: inline-block
    text-align: left

</style>
