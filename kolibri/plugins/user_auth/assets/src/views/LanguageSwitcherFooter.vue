<template>

  <div class="language-switcher-wrapper">
    <LanguageSwitcherList
      center
      class="list"
    />
  </div>

</template>


<script>

  import LanguageSwitcherList from 'kolibri/components/language-switcher/LanguageSwitcherList';

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
    flex-grow: 1;
    max-width: 1000px;
    margin-right: 36px;
    margin-left: 36px;
  }

</style>
