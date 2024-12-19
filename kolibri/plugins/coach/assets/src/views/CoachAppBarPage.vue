<template>

  <NotificationsRoot
    :authorized="authorized"
    :authorizedRole="authorizedRole"
  >
    <AppBarPage
      :title="appBarTitle || defaultAppBarTitle"
      :showNavigation="Boolean(classId)"
    >
      <div class="coach-main">
        <slot></slot>
      </div>
    </AppBarPage>
  </NotificationsRoot>

</template>


<script>

  import { mapState } from 'vuex';
  import AppBarPage from 'kolibri/components/pages/AppBarPage';
  import NotificationsRoot from 'kolibri/components/pages/NotificationsRoot';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useCoreCoach from '../composables/useCoreCoach';

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
    components: { AppBarPage, NotificationsRoot },
    mixins: [commonCoreStrings],
    setup() {
      const { authorized, pageTitle, appBarTitle, classId } = useCoreCoach();

      return {
        authorized,
        authorizedRole: 'adminOrCoach',
        classId,
        defaultPageTitle: pageTitle,
        defaultAppBarTitle: appBarTitle,
      };
    },
    props: {
      appBarTitle: {
        type: String,
        default: null,
      },
      pageTitle: {
        type: String,
        default: null,
      },
    },
    computed: {
      ...mapState({
        error: state => state.core.error,
      }),
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
