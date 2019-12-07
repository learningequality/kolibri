<template>

  <KModal
    :title="$tr('welcomeModalHeader')"
    :submitText="$tr('welcomeButtonDismissText')"
    @submit="$emit('submit')"
  >
    <p class="welcome-modal-description">
      {{ $tr('welcomeModalContentDescription') }}
    </p>

    <p class="welcome-modal-description">
      {{ $tr('welcomeModalPermissionsDescription') }}
    </p>
  </KModal>

</template>


<script>

  export default {
    name: 'WelcomeModal',
    render: createElement => window.setTimeout(createElement, 750),
    $trs: {
      welcomeModalHeader: 'Welcome to Kolibri!',
      welcomeModalContentDescription:
        'The first thing you should do is import some resources from the Channel tab.',
      welcomeModalPermissionsDescription:
        'The super admin account you created during setup has special permissions to do this. Learn more in the Permissions tab later.',
      welcomeButtonDismissText: 'OK',
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
