<template>

  <KModal
    :title="$tr('modalTitle')"
    :hasError="false"
    :submitText="coreString('removeAction')"
    :cancelText="coreString('cancelAction')"
    @submit="$emit('submit')"
    @cancel="$emit('cancel')"
  >
    <p>{{ $tr('confirmation', { username: username, classname: classname }) }}</p>
    <p>{{ $tr('description') }}</p>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

  export default {
    name: 'UserRemoveConfirmationModal',
    mixins: [commonCoreStrings],
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
      modalTitle: {
        message: 'Remove user',
        context:
          'Option to remove a user from a class. This does not delete them from the facility entirely.',
      },
      confirmation: {
        message: "Are you sure you want to remove '{ username }' from '{ classname }'?",
        context: 'Confirmation of delete user.',
      },
      description: {
        message: "You can still access this account from the 'Users' tab.",
        context: 'Information displayed when removing a user from a class.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
