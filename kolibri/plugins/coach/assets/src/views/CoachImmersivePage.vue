<template>

  <NotificationsRoot
    :authorized="authorized"
    :authorizedRole="authorizedRole"
  >
    <ImmersivePage
      :appBarTitle="appBarTitle || defaultAppBarTitle"
      :icon="icon"
      :route="route"
      :primary="primary"
      :loading="loading"
      :appearanceOverrides="appearanceOverrides"
    >
      <div
        v-if="!coreLoading"
        class="coach-main"
      >
        <slot></slot>
      </div>
    </ImmersivePage>
  </NotificationsRoot>

</template>


<script>

  import { mapState } from 'vuex';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import NotificationsRoot from 'kolibri/components/pages/NotificationsRoot';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useCoreCoach from '../composables/useCoreCoach';

  export default {
    name: 'CoachImmersivePage',
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
    components: { ImmersivePage, NotificationsRoot },
    mixins: [commonCoreStrings],
    setup() {
      const { authorized, pageTitle, appBarTitle } = useCoreCoach();

      return {
        authorized,
        authorizedRole: 'adminOrCoach',
        defaultPageTitle: pageTitle,
        defaultAppBarTitle: appBarTitle,
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
      icon: {
        type: String,
        default: 'close',
      },
      loading: {
        type: Boolean,
        default: null,
      },
      pageTitle: {
        type: String,
        default: null,
      },
      primary: {
        type: Boolean,
        required: false,
        default: true,
      },
      route: {
        type: Object,
        default: null,
      },
    },
    computed: {
      ...mapState({
        coreLoading: state => state.core.loading,
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
