<template>

  <k-modal
    :title="$tr('welcomeModalHeader')"
    :submitText="$tr('welcomeButtonDismissText')"
    @submit="emitCloseModal"
    @cancel="emitCloseModal"
  >
    <p class="welcome-modal-description">
      {{ $tr('welcomeModalContentDescription') }}
    </p>

    <p class="welcome-modal-description">
      {{ $tr('welcomeModalPermissionsDescription') }}
    </p>
  </k-modal>

</template>


<script>

  import kModal from 'kolibri.coreVue.components.kModal';
  import kButton from 'kolibri.coreVue.components.kButton';

  export default {
    name: 'welcomeModal',
    $trs: {
      welcomeModalHeader: 'Welcome to Kolibri!',
      welcomeModalContentDescription:
        'The first thing you should do is import some content from the Content tab.',
      welcomeModalPermissionsDescription:
        'The admin account you created during setup has special permissions to do this. Learn more in the Permissions tab later.',
      welcomeButtonDismissText: 'OK',
    },
    components: { kModal, kButton },
    methods: {
      emitCloseModal() {
        this.$emit('closeModal');
      },
    },
    render: createElement => window.setTimeout(createElement, 750),
  };

</script>


<style lang="scss" scoped>

  .welcome-modal {
    &-description {
      margin-top: 16px;
    }
    &-dismiss-button {
      margin-top: 24px;
      margin-bottom: 16px;
    }
  }

</style>
