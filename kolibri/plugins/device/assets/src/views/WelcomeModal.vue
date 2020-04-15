<template>

  <KModal
    :title="$tr('welcomeModalHeader')"
    :submitText="coreString('continueAction')"
    @submit="$emit('submit')"
  >
    <template v-if="showPostSyncVersion">
      <p class="welcome-modal-description">
        {{ $tr('welcomeModalContentDescription') }}
      </p>

      <p class="welcome-modal-description">
        {{ $tr('welcomeModalPermissionsDescription') }}
      </p>
    </template>
    <template v-else>
      <p class="welcome-modal-description">
        {{ $tr('postSyncWelcomeMessage1') }}
      </p>

      <p class="welcome-modal-description">
        {{ $tr('postSyncWelcomeMessage2', { facilityName }) }}
      </p>
    </template>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'WelcomeModal',
    mixins: [commonCoreStrings],
    computed: {
      showPostSyncVersion() {
        return false;
      },
      facilityName() {
        return 'the facility';
      },
    },
    render: createElement => window.setTimeout(createElement, 750),
    $trs: {
      welcomeModalHeader: 'Welcome to Kolibri!',
      welcomeModalContentDescription:
        'The first thing you should do is import some resources from the Channel tab.',
      welcomeModalPermissionsDescription:
        'The super admin account you created during setup has special permissions to do this. Learn more in the Permissions tab later.',
      postSyncWelcomeMessage1:
        'The first thing you should do is import some channels to this device.',
      postSyncWelcomeMessage2: `The learner reports, lessons, and quizzes in '{facilityName}' will not display properly until you import the resources associated with them.`,
    },
  };

</script>


<style lang="scss" scoped>

  .welcome-modal-description {
    margin-top: 16px;
  }
  .welcome-modal-dismiss-button {
    margin-top: 24px;
    margin-bottom: 16px;
  }

</style>
