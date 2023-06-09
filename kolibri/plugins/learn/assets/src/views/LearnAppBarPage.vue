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

    <template
      v-if="!deviceId"
      #subNav
    >
      <LearnTopNav ref="topNav" />
    </template>

    <slot></slot>

  </component>

</template>


<script>

  import AppBarPage from 'kolibri.coreVue.components.AppBarPage';
  import ImmersivePage from 'kolibri.coreVue.components.ImmersivePage';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import LearnTopNav from './LearnTopNav';
  import DeviceConnectionStatus from './DeviceConnectionStatus.vue';

  export default {
    name: 'LearnAppBarPage',
    components: {
      AppBarPage,
      ImmersivePage,
      LearnTopNav,
      DeviceConnectionStatus,
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
