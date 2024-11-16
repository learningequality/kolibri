<template>

  <AppBarPage :title="title">
    <div style="max-width: 1000px; margin: 0 auto">
      <slot></slot>
    </div>
  </AppBarPage>

</template>


<script>

  import { mapGetters } from 'vuex';
  import AppBarPage from 'kolibri/components/pages/AppBarPage';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useUser from 'kolibri/composables/useUser';

  export default {
    name: 'FacilityAppBarPage',
    components: { AppBarPage },
    mixins: [commonCoreStrings],
    setup() {
      const { userIsMultiFacilityAdmin } = useUser();
      return { userIsMultiFacilityAdmin };
    },
    props: {
      appBarTitle: {
        type: String,
        default: null,
      },
    },
    computed: {
      ...mapGetters(['currentFacilityName']),
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
