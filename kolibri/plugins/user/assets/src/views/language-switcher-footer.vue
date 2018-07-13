<template>

  <language-switcher-list class="list" />

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


<style lang="scss" scoped>

  .list {
    margin-right: 36px;
    margin-left: 36px;
    text-align: center;
  }

</style>
