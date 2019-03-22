<template>

  <KModal
    :title="$tr('modalTitle')"
    :hasError="false"
    :submitText="$tr('remove')"
    :cancelText="$tr('cancel')"
    @submit="$emit('confirm')"
    @cancel="$emit('cancel')"
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
    $trs: {
      modalTitle: 'Remove user',
      remove: 'Remove',
      cancel: 'Cancel',
      confirmation: "Are you sure you want to remove '{ username }' from '{ classname }'?",
    },
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
  };

</script>


<style lang="scss" scoped>

  p {
    word-break: keep-all;
  }

</style>
