<template>

  <AppBarCorePage :title="title">

    <template #subNav>
      <FacilityTopNav />
    </template>

    <slot></slot>

  </AppBarCorePage>

</template>


<script>

  import { mapGetters } from 'vuex';
  import AppBarCorePage from 'kolibri.coreVue.components.AppBarCorePage';
  import FacilityTopNav from './FacilityTopNav';

  export default {
    name: 'FacilityAppBarPage',
    components: { AppBarCorePage, FacilityTopNav },
    props: {
      appBarTitle: {
        type: String,
        default: null,
      },
    },
    computed: {
      ...mapGetters(['userIsMultiFacilityAdmin', 'currentFacilityName']),
      /* Returns the given appBarTitle prop if given, otherwise will return
         the facility label appropriate to whether there are multiple facilities
         and the current user is the correct kind of admin */
      title() {
        return this.appBarTitle || (this.userIsMultiFacilityAdmin && this.currentFacilityName)
          ? this.$tr('facilityLabelWithName', {
              facilityName: this.currentFacilityName,
            })
          : this.coreString('facilityLabel');
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
