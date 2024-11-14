<template>

  <component
    :is="page"
    :appBarTitle="appBarTitle"
    :appearanceOverrides="appearanceOverrides"
    :loading="loading"
    :primary="false"
    :route="route"
    :title="appBarTitle"
  >
    <template #actions>
      <DeviceConnectionStatus
        v-if="deviceId"
        :deviceId="deviceId"
        color="white"
      />
    </template>

    <template #storageNotif>
      <div v-if="page === 'AppBarPage'">
        <StorageNotification :showBanner="showStorageNotification" />
      </div>
    </template>

    <slot></slot>
  </component>

</template>


<script>

  import AppBarPage from 'kolibri/components/pages/AppBarPage';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { LearnerDeviceStatus } from 'kolibri/constants';
  import DeviceConnectionStatus from './DeviceConnectionStatus.vue';
  import StorageNotification from './StorageNotification';

  export default {
    name: 'LearnAppBarPage',
    components: {
      AppBarPage,
      ImmersivePage,
      DeviceConnectionStatus,
      StorageNotification,
    },
    mixins: [commonCoreStrings],

    props: {
      appBarTitle: {
        type: String,
        default: null,
      },
      appearanceOverrides: {
        type: Object,
        required: false,
        default: null,
      },
      deviceId: {
        type: String,
        default: null,
      },
      route: {
        type: Object,
        default() {
          return {};
        },
      },
      loading: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      page() {
        return this.deviceId ? 'ImmersivePage' : 'AppBarPage';
      },
      showStorageNotification() {
        return this.userDeviceStatus === LearnerDeviceStatus.INSUFFICIENT_STORAGE;
      },
    },
  };

</script>


<style lang="scss" scoped>

  .loader {
    position: fixed;
    top: 64px;
    right: 0;
    left: 0;
  }

</style>
