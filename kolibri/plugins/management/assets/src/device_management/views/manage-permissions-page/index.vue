<template>

  <div>
    <div>
      <div class="header">
        <h1>Device Permissions</h1>
        <p>Make changes to what users can manage on your device</p>
      </div>
      <search-bar v-model="searchFilterText" />
    </div>

    <user-grid />
  </div>

</template>


<script>

  import searchBar from './search-bar';
  import userGrid from './user-grid';

  export default {
    name: 'DeviceManagementPage',
    components: {
      searchBar,
      userGrid,
    },
    data() {
      return {
        searchFilterText: '',
      };
    },
    computed: {},
    methods: {},
    vuex: {
      getters: {
        facilityUsers: state => state.pageState.facilityUsers,
      },
      actions: {},
    },
    $trs: {
    },
  };

</script>


<style lang="stylus" scoped>

</style>
