<template>

  <KModal
    :title="$tr('modalTitle')"
    :hasError="false"
    :submitText="$tr('remove')"
    :cancelText="coreCommon$tr('cancelAction')"
    @submit="$emit('submit')"
    @cancel="$emit('cancel')"
  >
    <p>{{ $tr('confirmation', { username: username, classname: classname }) }}</p>
    <p>{{ $tr('description') }}</p>
  </KModal>

</template>


<script>

  import KModal from 'kolibri.coreVue.components.KModal';
  import coreStringsMixin from 'kolibri.coreVue.mixins.coreStringsMixin';

  export default {
    name: 'UserRemoveConfirmationModal',
    components: {
      KModal,
    },
    mixins: [coreStringsMixin],
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
      confirmation: "Are you sure you want to remove '{ username }' from '{ classname }'?",
      description: "You can still access this account from the 'Users' tab.",
    },
  };

</script>


<style lang="scss" scoped></style>
