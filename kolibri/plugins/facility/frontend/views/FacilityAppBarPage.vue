<template>

  <AppBarPage
    :title="title"
    :appearanceOverrides="appearanceOverrides"
    :loading="loading"
  >
    <template #default="{ pageContentHeight, appBarHeight }">
      <div
        ref="bannerContainer"
        class="banner-container"
      >
        <LocalNotificationBanner />
      </div>
      <slot
        :pageContentHeight="slotContentHeight(pageContentHeight)"
        :appBarHeight="appBarHeight"
      ></slot>
    </template>
  </AppBarPage>

</template>


<script>

  import { ref } from 'vue';
  import { useElementSize } from '@vueuse/core';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import AppBarPage from 'kolibri/components/pages/AppBarPage';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useFacilities from 'kolibri-common/composables/useFacilities';
  import useFacility from 'kolibri-common/composables/useFacility';
  import LocalNotificationBanner from 'kolibri-common/components/LocalNotificationBanner';

  export default {
    name: 'FacilityAppBarPage',
    components: { AppBarPage, LocalNotificationBanner },
    mixins: [commonCoreStrings],
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();
      const { userIsMultiFacilityAdmin } = useFacilities();
      const { currentFacilityName } = useFacility();
      const bannerContainer = ref(null);
      const { height: bannerHeight } = useElementSize(bannerContainer, undefined, {
        box: 'border-box',
      });
      function slotContentHeight(pageContentHeight) {
        return windowIsSmall.value ? pageContentHeight : pageContentHeight - bannerHeight.value;
      }
      return {
        userIsMultiFacilityAdmin,
        currentFacilityName,
        bannerContainer,
        slotContentHeight,
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
      loading: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      /* Returns the given appBarTitle prop if given, otherwise will return
       the facility label appropriate to whether there are multiple facilities
       and the current user is the correct kind of admin */
      title() {
        return (
          this.appBarTitle ||
          (this.userIsMultiFacilityAdmin && this.currentFacilityName
            ? this.$tr('facilityLabelWithName', {
              facilityName: this.currentFacilityName,
            })
            : this.coreString('facilityLabel'))
        );
      },
    },
    $trs: {
      facilityLabelWithName: {
        message: 'Facility – {facilityName}',
        context: 'Indicates the name of the facility.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .banner-container {
    display: flow-root;
  }

</style>
