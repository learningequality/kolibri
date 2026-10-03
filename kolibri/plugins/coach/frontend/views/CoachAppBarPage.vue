<template>

  <NotificationsRoot
    :authorized="authorized"
    :authorizedRole="authorizedRole"
  >
    <AppBarPage
      :title="appBarTitle || defaultAppBarTitle"
      :showNavigation="Boolean(classId)"
      :loading="loading"
    >
      <div class="coach-main">
        <slot></slot>
      </div>
    </AppBarPage>
  </NotificationsRoot>

</template>


<script>

  import AppBarPage from 'kolibri/components/pages/AppBarPage';
  import NotificationsRoot from 'kolibri/components/pages/NotificationsRoot';
  import useCoreCoach from '../composables/useCoreCoach';

  export default {
    name: 'CoachAppBarPage',
    components: { AppBarPage, NotificationsRoot },
    setup() {
      const { authorized, appBarTitle, classId } = useCoreCoach();

      return {
        authorized,
        authorizedRole: 'adminOrCoach',
        classId,
        defaultAppBarTitle: appBarTitle,
      };
    },
    props: {
      appBarTitle: {
        type: String,
        default: null,
      },
      loading: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .coach-main {
    margin: 0 auto;
  }

</style>
