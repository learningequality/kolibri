<template>

  <KModal
    :title="$tr('modalTitle')"
    :hasError="false"
    :submitText="coreString('removeAction')"
    :cancelText="coreString('cancelAction')"
    @cancel="$emit('cancel')"
    @submit="$emit('submit')"
  >
    <p>
      {{ $tr('confirmation', { username: username, classname: groupName }) }}
    </p>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'RemoveFromGroupModal',
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
      confirmation: "Are you sure you want to remove '{ username }' from '{ classname }'?",
    },
  };

</script>


<style lang="scss" scoped></style>
