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
    <template v-if="disconnected" #actions>
      <span class="inner" style="color:white; font-size: 14px;">
        {{ coreString('disconnected') }}
      </span>
      <KIconButton
        icon="disconnected"
        color="white"
        :tooltip="coreString('disconnected')"
        :ariaLabel="coreString('disconnected')"
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
  import { useConnectionChecker, useDevicesWithFacility } from 'kolibri.coreVue.componentSets.sync';
  import { ref, watch } from 'kolibri.lib.vueCompositionApi';
  import LearnTopNav from './LearnTopNav';

  export default {
    name: 'LearnAppBarPage',
    components: {
      AppBarPage,
      ImmersivePage,
      LearnTopNav,
    },
    mixins: [commonCoreStrings],
    setup(props) {
      const disconnected = ref(false);
      const { devices } = useDevicesWithFacility();
      const { doCheck } = useConnectionChecker(devices);
      watch(devices, currentValue => {
        if (!props.deviceId) return;
        if (currentValue.length > 0) {
          doCheck(props.deviceId).then(device => {
            disconnected.value = !device.available;
          });
        } else {
          disconnected.value = true;
        }
      });
      return {
        disconnected,
      };
    },
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
      loading: {
        type: Boolean,
        default: null,
      },
      route: {
        type: Object,
        default() {
          return {};
        },
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
