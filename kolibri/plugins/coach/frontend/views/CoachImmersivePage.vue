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
        v-if="!loading"
        class="coach-main"
      >
        <slot></slot>
      </div>
    </ImmersivePage>
  </NotificationsRoot>

</template>


<script>

  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import NotificationsRoot from 'kolibri/components/pages/NotificationsRoot';
  import useCoreCoach from '../composables/useCoreCoach';

  export default {
    name: 'CoachImmersivePage',
    components: { ImmersivePage, NotificationsRoot },
    setup() {
      const { authorized, appBarTitle } = useCoreCoach();

      return {
        authorized,
        authorizedRole: 'adminOrCoach',
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
  };

</script>
