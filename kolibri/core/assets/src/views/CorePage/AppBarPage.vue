<template>

  <!-- TODO useScrollPosition to set scrollPosition...
    here or in router, but somewhere -->
  <div class="main">
    <ScrollingHeader :scrollPosition="0">
      <AppBar
        ref="appBar"
        class="app-bar"
        :title="title"
        @toggleSideNav="navShown = !navShown"
        @showLanguageModal="languageModalShown = true"
      >
        <template #sub-nav>
          <slot name="subNav"></slot>
        </template>
      </AppBar>
      <KLinearLoader
        v-if="loading"
        type="indeterminate"
        :delay="false"
      />
      <div aria-live="polite">
        <StorageNotification />
      </div>
    </ScrollingHeader>

    <div class="main-wrapper" :style="wrapperStyles">
      <slot></slot>
    </div>

    <SideNav
      ref="sideNav"
      :navShown="navShown"
      @toggleSideNav="navShown = !navShown"
    />
    <LanguageSwitcherModal
      v-if="languageModalShown"
      ref="languageSwitcherModal"
      :style="{ color: $themeTokens.text }"
      @cancel="languageModalShown = false"
    />
  </div>

</template>


<script>

  import LanguageSwitcherModal from 'kolibri.coreVue.components.LanguageSwitcherModal';
  import ScrollingHeader from 'kolibri.coreVue.components.ScrollingHeader';
  import SideNav from 'kolibri.coreVue.components.SideNav';
  // import { mapState, mapGetters } from 'vuex';
  // import { computed } from 'vue-demi';
  import AppBar from '../AppBar';
  import StorageNotification from '../StorageNotification';
  // import useUserSyncStatus from '../../composables/useUserSyncStatus.js';

  export default {
    name: 'AppBarPage',
    components: { AppBar, LanguageSwitcherModal, ScrollingHeader, SideNav, StorageNotification },
    // setup() {
    // const id = computed({
    //   ...mapGetters(['isUserLoggedIn', 'totalPoints', 'isLearner']),
    //   ...mapState({
    //     userId: state => state.core.session.user_id,
    //   }),
    // });
    // const { status, queued, lastSynced, deviceStatus, deviceStatusSentiment }
    //  = useUserSyncStatus(
    //   '5'
    // );
    // return {
    //   queued,
    //   lastSynced,
    //   status,
    //   deviceStatus,
    //   deviceStatusSentiment,
    // };
    // },
    props: {
      title: {
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
        default: null,
      },
      // userId: {
      //   type: String,
      //   required: false,
      // },
    },
    data() {
      return {
        appBarHeight: 0,
        languageModalShown: false,
        navShown: false,
      };
    },
    computed: {
      wrapperStyles() {
        return this.appearanceOverrides
          ? this.appearanceOverrides
          : {
              width: '100%',
              maxWidth: '1064px',
              margin: 'auto',
              backgroundColor: this.$themePalette.grey.v_100,
              paddingLeft: '32px',
              paddingRight: '32px',
              paddingTop: this.appBarHeight + 32 + 'px',
              paddingBottom: '72px',
              marginTop: 0,
            };
      },
    },

    mounted() {
      this.$nextTick(() => {
        this.appBarHeight = this.$refs.appBar.$el.scrollHeight || 0;
      });
      console.log(this.userId);
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .app-bar {
    @extend %dropshadow-4dp;

    width: 100%;
  }

</style>
