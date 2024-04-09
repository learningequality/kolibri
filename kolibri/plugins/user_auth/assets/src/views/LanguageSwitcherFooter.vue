<template>

  <div class="language-switcher-wrapper">
    <LanguageSwitcherList center class="list" />
  </div>

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

  .language-switcher-wrapper {
    display: flex;
    justify-content: center;
    width: 100%;
  }
  .list {
    margin-right: 36px;
    margin-left: 36px;
    max-width: 1000px;
    flex-grow: 1;
  }

</style>
