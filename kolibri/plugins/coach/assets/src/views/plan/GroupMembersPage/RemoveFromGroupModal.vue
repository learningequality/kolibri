<template>

  <KModal
    :title="$tr('modalTitle')"
    :hasError="false"
    :submitText="$tr('remove')"
    :cancelText="$tr('cancel')"
    @cancel="$emit('cancel')"
    @submit="$emit('submit')"
  >
    <p>
      {{ $tr('confirmation', { username: username, classname: groupName }) }}
    </p>
  </KModal>

</template>


<script>

  import KModal from 'kolibri.coreVue.components.KModal';

  export default {
    name: 'RemoveFromGroupModal',
    components: {
      KModal,
    },
    props: {
      groupName: {
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
    },
  };

</script>


<style lang="scss" scoped></style>
