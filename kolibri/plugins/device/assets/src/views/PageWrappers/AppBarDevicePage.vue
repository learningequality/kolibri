<template>

  <AppBarPage :title="$tr('deviceManagementTitle')">

    <template #subNav>
      <DeviceTopNav v-if="!hideSubNav" />
    </template>

    <component :is="slotContainerType" :style="slotContainerStyles">
      <slot></slot>
    </component>

  </AppBarPage>

</template>


<script>

  import AppBarPage from 'kolibri.coreVue.components.AppBarPage';
  import DeviceTopNav from '../DeviceTopNav';
  import { PageNames } from '../../constants';

  export default {
    name: 'AppBarDevicePage',
    components: { AppBarPage, DeviceTopNav },
    props: {
      hideSubNav: {
        type: Boolean,
        default: false,
      },
      noKPageContainer: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      slotContainerStyles() {
        let styles = {};

        // When the content is rendered in a KPageContainer
        if (!this.noKPageContainer) {
          styles = { 'max-width': '1000px', margin: '32px auto 0' };
        }

        if (this.$route.name === PageNames.DEVICE_SETTINGS_PAGE) {
          // Need to override overflow rule for setting page
          styles['overflowX'] = 'inherit';
        }

        return styles;
      },
      slotContainerType() {
        /* Most pages should be rendered in a KPageContainer (maybe all) - this
           allows a Device page to just be put into a plain div instead depending on the prop */
        return this.noKPageContainer ? 'div' : 'k-page-container';
      },
    },
    $trs: {
      deviceManagementTitle: {
        message: 'Device',
        context:
          'The device is the physical or virtual machine that has the Kolibri server installed on it.',
      },
    },
  };

</script>
