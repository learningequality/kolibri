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

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

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
      modalTitle: {
        message: 'Remove user',
        context:
          "Title of the confirmation window that displays when a user uses the 'Remove' button to remove a learner from a group.\n\nNote that learners removed from a group will not be deleted from the database, and their accounts can still accessed from the 'Users' tab in the 'Facility' dashboard.",
      },
      confirmation: {
        message: "Are you sure you want to remove '{ username }' from '{ classname }'?",
        context:
          "Description of the confirmation window that displays when a user uses the 'Remove' button to remove a learner from a group.\n\nNote that learners removed from a group will not be deleted from the database, and their accounts can still accessed from the 'Users' tab in the 'Facility' dashboard.",
      },
    },
  };

</script>


<style lang="scss" scoped></style>
