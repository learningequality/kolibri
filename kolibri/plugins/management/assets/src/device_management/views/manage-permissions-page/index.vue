<template>

  <subpage-container>
    <div>
      <div class="header">
        <h1>Device Permissions</h1>
        <p>Make changes to what users can manage on your device</p>
      </div>
      <search-bar v-model="searchFilterText" />
    </div>

    <user-grid />
  </subpage-container>

</template>


<script>

  import searchBar from './search-bar';
  import userGrid from './user-grid';
  import subpageContainer from '../containers/subpage-container';

  export default {
    name: 'DeviceManagementPage',
    components: {
      searchBar,
      subpageContainer,
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
