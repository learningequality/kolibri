<template>

  <AppBarPage
    :title="title"
    :appearanceOverrides="appearanceOverrides"
    :loading="loading"
  >
    <template #default="{ pageContentHeight, appBarHeight }">
      <ImpactStoryBanner />
      <slot
        :pageContentHeight="pageContentHeight"
        :appBarHeight="appBarHeight"
      ></slot>
    </template>
  </AppBarPage>

</template>


<script>

  import AppBarPage from 'kolibri/components/pages/AppBarPage';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useFacilities from 'kolibri-common/composables/useFacilities';
  import useFacility from 'kolibri-common/composables/useFacility';
  import ImpactStoryBanner from 'kolibri-common/components/ImpactStoryBanner';

  export default {
    name: 'FacilityAppBarPage',
    components: { AppBarPage, ImpactStoryBanner },
    mixins: [commonCoreStrings],
    setup() {
      const { userIsMultiFacilityAdmin } = useFacilities();
      const { currentFacilityName } = useFacility();
      return { userIsMultiFacilityAdmin, currentFacilityName };
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
