<template>

  <NotificationsRoot
    :authorized="authorized"
    :authorizedRole="authorizedRole"
  >
    <AppBarPage :title="appBarTitle || defaultAppBarTitle">
      <template
        v-if="showSubNav && !isAppContext"
        #subNav
      >
        <TopNavbar />
      </template>
      <div class="coach-main">
        <slot></slot>
      </div>
    </AppBarPage>

    <router-view />
  </NotificationsRoot>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import AppBarPage from 'kolibri.coreVue.components.AppBarPage';
  import NotificationsRoot from 'kolibri.coreVue.components.NotificationsRoot';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import useCoreCoach from '../composables/useCoreCoach';
  import TopNavbar from './TopNavbar';

  export default {
    name: 'CoachAppBarPage',
    metaInfo() {
      return {
        // Use arrow function to bind $tr to this component
        titleTemplate: title => {
          if (this.error) {
            return this.$tr('kolibriTitleMessage', { title: this.$tr('errorPageTitle') });
          }
          if (!title) {
            // If no child component sets title, it reads 'Kolibri'
            return this.coreString('kolibriLabel');
          }
          // If child component sets title, it reads 'Child Title - Kolibri'
          return this.$tr('kolibriTitleMessage', { title });
        },
        title: this.pageTitle || this.defaultPageTitle,
      };
    },
    components: { AppBarPage, NotificationsRoot, TopNavbar },
    mixins: [commonCoreStrings],
    setup() {
      const { pageTitle, appBarTitle } = useCoreCoach();

      return {
        defaultPageTitle: pageTitle,
        defaultAppBarTitle: appBarTitle,
      };
    },
    props: {
      appBarTitle: {
        type: String,
        default: null,
      },
      authorized: {
        type: Boolean,
        required: false,
        default: true,
      },
      authorizedRole: {
        type: String,
        default: null,
      },
      pageTitle: {
        type: String,
        default: null,
      },
      showSubNav: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
    computed: {
      ...mapState({
        error: state => state.core.error,
      }),
      ...mapGetters(['isAppContext']),
    },
    $trs: {
      kolibriTitleMessage: {
        message: '{ title } - Kolibri',
        context: 'DO NOT TRANSLATE\nCopy the source string.',
      },
      errorPageTitle: {
        message: 'Error',
        context:
          "When Kolibri throws an error, this is the text that's used as the title of the error page. The description of the error follows below.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  .coach-main {
    margin: 0 auto;
  }

</style>
