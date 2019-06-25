<template>

  <div>

    <AuthMessage v-if="!isSuperuser" authorizedRole="superuser" />

    <div v-else>
      <div class="description">
        <h1>{{ coreCommon$tr('devicePermissionsLabel') }}</h1>
        <p>{{ $tr('devicePermissionsDescription') }}</p>
      </div>

      <div class="filter-box">
        <KFilterTextbox
          v-model="searchFilterText"
          :placeholder="$tr('searchPlaceholder')"
        />
      </div>

      <UserGrid :searchFilter="searchFilterText" />
    </div>

  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import AuthMessage from 'kolibri.coreVue.components.AuthMessage';
  import KFilterTextbox from 'kolibri.coreVue.components.KFilterTextbox';
  import { coreStringsMixin } from 'kolibri.coreVue.mixins.coreStringsMixin';
  import UserGrid from './UserGrid';

  export default {
    name: 'ManagePermissionsPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      AuthMessage,
      KFilterTextbox,
      UserGrid,
    },
    mixins: [coreStringsMixin],
    data() {
      return {
        searchFilterText: '',
      };
    },
    computed: {
      ...mapGetters(['isSuperuser']),
    },
    $trs: {
      devicePermissionsDescription: 'Make changes to what users can manage on your device',
      searchPlaceholder: 'Search for a user...',
      documentTitle: 'Manage Device Permissions',
    },
  };

</script>


<style lang="scss" scoped>

  .description {
    margin-bottom: 2em;
  }

  .filter-box {
    margin-bottom: 1em;
    text-align: right;
  }

</style>
