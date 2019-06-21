<template>

  <KModal
    :title="$tr('modalTitle')"
    :hasError="false"
    :submitText="$tr('remove')"
    :cancelText="coreCommon$tr('cancelAction')"
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
  import coreStringsMixin from 'kolibri.coreVue.mixins.coreStringsMixin';

  export default {
    name: 'RemoveFromGroupModal',
    components: {
      KModal,
    },
    mixins: [coreStringsMixin],
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
      confirmation: "Are you sure you want to remove '{ username }' from '{ classname }'?",
    },
  };

</script>


<style lang="scss" scoped></style>
