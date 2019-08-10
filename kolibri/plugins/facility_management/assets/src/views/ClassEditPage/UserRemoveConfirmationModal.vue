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

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

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
      modalTitle: 'Remove user',
      confirmation: "Are you sure you want to remove '{ username }' from '{ classname }'?",
      description: "You can still access this account from the 'Users' tab.",
    },
  };

</script>


<style lang="scss" scoped></style>
