<template>

  <subpage-container>

    <div class="pure-g">
      <responsive b3="pure-u-1-2" default="pure-u-1-1">
        <h1>{{ $tr('devicePermissionsHeader') }}</h1>
        <p>{{ $tr('devicePermissionsDescription') }}</p>
      </responsive>
      <responsive b3="pure-u-1-2" default="pure-u-1-1">
        <search-bar v-model="searchFilterText" />
      </responsive>
    </div>

    <user-grid />

  </subpage-container>

</template>


<script>

  import searchBar from './search-bar';
  import userGrid from './user-grid';
  import subpageContainer from '../containers/subpage-container';
  import responsive from '../containers/responsive-container';

  export default {
    name: 'DeviceManagementPage',
    components: {
      responsive,
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
      devicePermissionsHeader: 'Device Permissions',
      devicePermissionsDescription: 'Make changes to what users can manage on your device',
    },
  };

</script>


<style lang="stylus" scoped>

</style>
