<template>

  <KModal
    :title="removeModalStrings.$tr('modalTitle')"
    :hasError="false"
    :submitText="removeModalStrings.$tr('remove')"
    :cancelText="removeModalStrings.$tr('cancel')"
    @submit="$emit('confirm')"
    @cancel="$emit('cancel')"
  >
    <p>
      {{ removeModalStrings.$tr('confirmation', { username: username, classname: groupName }) }}
    </p>
  </KModal>

</template>


<script>

  import KModal from 'kolibri.coreVue.components.KModal';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import UserRemoveConfirmationModal from '../../../../../../facility_management/assets/src/views/ClassEditPage/UserRemoveConfirmationModal';

  const removeModalStrings = crossComponentTranslator(UserRemoveConfirmationModal);

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
    data() {
      return {
        removeModalStrings,
      };
    },
  };

</script>


<style lang="scss" scoped>

  p {
    word-break: keep-all;
  }

</style>
