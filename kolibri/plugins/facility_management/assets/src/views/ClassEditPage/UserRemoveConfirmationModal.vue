<template>

  <KModal
    :title="$tr('modalTitle')"
    :hasError="false"
    :submitText="$tr('remove')"
    :cancelText="$tr('cancel')"
    @submit="$emit('submit')"
    @cancel="$emit('cancel')"
  >
    <p>{{ $tr('confirmation', { username: username, classname: classname }) }}</p>
    <p>{{ $tr('description') }}</p>
  </KModal>

</template>


<script>

  import KModal from 'kolibri.coreVue.components.KModal';

  export default {
    name: 'UserRemoveConfirmationModal',
    components: {
      KModal,
    },
    props: {
      classname: {
        type: String,
        required: true,
      },
      username: {
        type: String,
        required: true,
      },
    },
    $trs: {
      modalTitle: 'Remove user',
      remove: 'Remove',
      cancel: 'Cancel',
      confirmation: "Are you sure you want to remove '{ username }' from '{ classname }'?",
      description: "You can still access this account from the 'Users' tab.",
    },
  };

</script>


<style lang="scss" scoped></style>
