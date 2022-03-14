<template>

  <div class="main-wrapper" :style="wrapperStyles">
    <FacilityAppBar
      ref="appBar"
      :title="title"
      :hideNavBar="hideNavBar"
      @toggleSideNav="navShown = !navShown"
      @showLanguageModal="languageModalShown = true"
    />

    <slot></slot>

    <SideNav
      :navShown="navShown"
      @toggleSideNav="navShown = !navShown"
    />

    <LanguageSwitcherModal
      v-if="languageModalShown"
      :style="{ color: $themeTokens.text }"
      @cancel="languageModalShown = false"
    />
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import LanguageSwitcherModal from 'kolibri.coreVue.components.LanguageSwitcherModal';
  import SideNav from 'kolibri.coreVue.components.SideNav';
  import FacilityAppBar from './FacilityAppBar';

  export default {
    name: 'AppBarPageRoot',
    components: { FacilityAppBar, LanguageSwitcherModal, SideNav },
    props: {
      appBarTitle: {
        type: String,
        default: null,
      },
      hideNavBar: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        appBarHeight: 0,
        languageModalShown: false,
        navShown: false,
      };
    },
    computed: {
      ...mapGetters(['userIsMultiFacilityAdmin', 'currentFacilityName']),
      /* Returns the given appBarTitle prop if given, otherwise will return
         the facility label appropriate to whether there are multiple facilities
         and the current user is the correct kind of admin */
      title() {
        return this.appBarTitle || this.userIsMultiFacilityAdmin
          ? this.$tr('facilityLabelWithName', {
              facilityName: this.currentFacilityName,
            })
          : this.coreString('facilityLabel');
      },
      wrapperStyles() {
        return {
          width: '100%',
          display: 'inline-block',
          backgroundColor: this.$themePalette.grey.v_100,
          paddingLeft: '32px',
          paddingRight: '32px',
          paddingBottom: '72px',
          paddingTop: this.appBarHeight + 16 + 'px',
        };
      },
    },
    mounted() {
      this.appBarHeight = this.$refs.appBar.$el.clientHeight;
    },
    $trs: {
      facilityLabelWithName: {
        message: 'Facility – {facilityName}',
        context: 'Indicates the name of the facility.',
      },
    },
  };

</script>
