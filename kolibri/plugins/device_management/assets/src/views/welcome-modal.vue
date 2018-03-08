<template>

  <core-modal
    :title="$tr('welcomeModalHeader')"
    :enableBgClickCancel="false"
    @enter="emitCloseModal"
    @cancel="emitCloseModal"
  >
    <p class="welcome-modal-description">
      {{ $tr('welcomeModalContentDescription') }}
    </p>

    <p class="welcome-modal-description">
      {{ $tr('welcomeModalPermissionsDescription') }}
    </p>

    <div class="core-modal-buttons">
      <k-button
        :text="$tr('welcomeButtonDismissText')"
        :primary="true"
        @click="emitCloseModal"
      />
    </div>

  </core-modal>

</template>


<script>

  import coreModal from 'kolibri.coreVue.components.coreModal';
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
    components: { coreModal, kButton },
    methods: {
      emitCloseModal() {
        this.$emit('closeModal');
      },
    },
    render: createElement => window.setTimeout(createElement, 750),
  };

</script>


<style scoped lang="stylus">

  .welcome-modal
    &-description
      margin-top: 16px
    &-dismiss-button
      margin-top: 24px
      margin-bottom: 16px

</style>
