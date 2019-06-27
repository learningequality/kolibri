<template>

  <KModal
    :title="$tr('modalTitle')"
    :hasError="false"
    :submitText="coreCommon$tr('removeAction')"
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
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'RemoveFromGroupModal',
    components: {
      KModal,
    },
    mixins: [commonCoreStrings],
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
