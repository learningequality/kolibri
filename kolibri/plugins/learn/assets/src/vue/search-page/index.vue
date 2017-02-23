<template>

  <div>
    <form @submit.prevent="search">
    <ui-textbox
      name="search"
      label="search"
      type="search"
      :placeholder="`$tr('searchWithin') ${channelName}`"
      :autocomplete="true"
      icon="search"
      :autofocus="true"
      v-model="searchInput"
      @input=""/>
    </form>
    <div class="search-results">

    </div>
  </div>

</template>


<script>

  const throttle = require('lodash.throttle');

  module.exports = {
    $trNameSpace: 'learnSearch',

    $trs: {

      searchWithin: 'Search within',
      searchResults: 'Search results:',
      noMatches: 'Could not find any matches',
      cancel: 'Cancel',
    },
    data: () => ({
      searchInput: '',
      channelName: '',
    }),
    components: {
      'ui-textbox': require('keen-ui/src/UiTextbox'),
    },
    methods: {
      triggerSearchAction() {
        this.triggerSearch(this.searchInput);
      },
      search: throttle(function search() {
        this.triggerSearchAction();
      }, 500),
    },
  };

</script>


<style lang="stylus" scoped></style>
