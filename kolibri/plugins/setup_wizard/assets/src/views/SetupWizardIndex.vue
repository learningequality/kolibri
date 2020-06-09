<template>

  <div class="onboarding">

    <ErrorPage
      v-if="error"
      class="body"
      :class="!windowIsLarge ? 'mobile' : ''"
    />

    <LoadingPage
      v-else-if="loading"
      class="body"
      :class="!windowIsLarge ? 'mobile' : ''"
    />

    <template v-else>
      <router-view />
    </template>

  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import LoadingPage from './submission-states/LoadingPage';
  import ErrorPage from './submission-states/ErrorPage';

  export default {
    name: 'SetupWizardIndex',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      LoadingPage,
      ErrorPage,
    },
    mixins: [commonCoreStrings, responsiveWindowMixin],
    computed: {
      ...mapState(['loading', 'error']),
    },
    // As a minimal precaution, we restart the entire wizard if a user refreshes in the middle
    // and loses saved state
    beforeMount() {
      if (!this.$store.state.started) {
        this.$router.replace('/');
      }
    },
    $trs: {
      documentTitle: 'Setup Wizard',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  // from http://nicolasgallagher.com/micro-clearfix-hack/
  @mixin clearfix() {
    zoom: 1;
    &::after,
    &::before {
      display: table;
      content: '';
    }
    &::after {
      clear: both;
    }
  }

  .onboarding {
    @include clearfix(); // child margin leaks up into otherwise empty parent

    width: 100%;
  }

  .body {
    width: 90%;
    max-width: 550px;
    margin-top: 64px;
    margin-right: auto;
    margin-bottom: 32px;
    margin-left: auto;
  }

  .page-wrapper {
    padding: 8px;
  }

  // Override KPageContainer styles
  /deep/ .page-container {
    max-width: 650px;
    padding: 36px;
    margin: auto;
    overflow: visible;
  }

  .mobile {
    margin-top: 40px;
    margin-bottom: 24px;
  }

</style>
