<template>

  <div>
    <div>
      <div class="header">
        <h1>Device Permissions</h1>
        <p>Make changes to what users can manage on your device</p>
      </div>
      <search-bar v-model="searchFilterText" />
    </div>

    <div>
      <p>User Grid</p>
      <p>Filter: {{ searchFilterText }}</p>
    </div>

  </div>

</template>


<script>

  import searchBar from './search-bar';

  export default {
    name: 'DeviceManagementPage',
    components: {
      searchBar,
    },
    data() {
      return {
        searchFilterText: '',
      };
    },
    computed: {},
    methods: {},
    vuex: {
      getters: {},
      actions: {},
    },
    $trs: {
      searchFilterLabel: 'Search for a user',
      searchFilterPlaceholder: 'Search for a user...',
    },
  };

</script>


<style lang="stylus" scoped>

</style>
