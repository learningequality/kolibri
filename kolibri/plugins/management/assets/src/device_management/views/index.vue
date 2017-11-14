<template>

  <core-base :topLevelPageName="DEVICE" :appBarTitle="$tr('deviceManagementTitle')">
    <transition name="delay-entry">
      <welcome-modal @closeModal="hideWelcomeModal" v-if="welcomeModalVisible" />
    </transition>

    <div>
      <top-navigation v-if="canManageContent" />
      <component :is="currentPage" />
    </div>
  </core-base>

</template>


<script>

  import { TopLevelPageNames } from 'kolibri.coreVue.vuex.constants';
  import { PageNames } from '../constants';
  import { canManageContent } from 'kolibri.coreVue.vuex.getters';
  import coreBase from 'kolibri.coreVue.components.coreBase';
  import topNavigation from './device-top-nav';
  import manageContentPage from './manage-content-page';
  import managePermissionsPage from './manage-permissions-page';
  import userPermissionsPage from './user-permissions-page';
  import welcomeModal from './welcome-modal';

  const pageNameComponentMap = {
    [PageNames.MANAGE_CONTENT_PAGE]: 'manageContentPage',
    [PageNames.MANAGE_PERMISSIONS_PAGE]: 'managePermissionsPage',
    [PageNames.USER_PERMISSIONS_PAGE]: 'userPermissionsPage',
  };

  export default {
    name: 'deviceManagementRoot',
    components: {
      coreBase,
      welcomeModal,
      manageContentPage,
      managePermissionsPage,
      topNavigation,
      userPermissionsPage,
    },
    computed: {
      DEVICE: () => TopLevelPageNames.DEVICE,
      currentPage() {
        return pageNameComponentMap[this.pageName];
      },
    },
    vuex: {
      getters: {
        pageName: ({ pageName }) => pageName,
        welcomeModalVisible: ({ welcomeModalVisible }) => welcomeModalVisible,
        canManageContent,
      },
      actions: {
        hideWelcomeModal(store) {
          store.dispatch('SET_WELCOME_MODAL_VISIBLE', false);
        },
      },
    },
    $trs: {
      deviceManagementTitle: 'Device',
    },
  };

</script>


<style lang="stylus" scoped>

  .delay-entry
    &-enter
      opacity: 0
    &-enter-active
      transition: opacity 0.75s

</style>
