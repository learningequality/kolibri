<template>

  <LanguageSwitcherList class="list" />

</template>


<script>

  import LanguageSwitcherList from 'kolibri.coreVue.components.LanguageSwitcherList';

  export default {
    name: 'LanguageSwitcherFooter',
    components: {
      LanguageSwitcherList,
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
