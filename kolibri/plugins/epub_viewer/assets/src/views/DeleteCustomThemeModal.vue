<template>

  <KModal
    :title="title"
    :submitText="coreString('deleteAction')"
    :cancelText="coreString('cancelAction')"
    @submit="$emit('submit')"
    @cancel="$emit('cancel')"
  >
    <p v-if="themeName">
      {{ $tr('confirmationQuestion', { themeName }) }}
    </p>
    <p>{{ coreString('cannotUndoActionWarning') }}</p>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'DeleteCustomThemeModal',
    mixins: [commonCoreStrings],
    props: {
      themeName: {
        type: String,
        default: null,
      },
    },
    computed: {
      title() {
        return this.$tr('titleDeleteTheme');
      },
    },
    $trs: {
      confirmationQuestion: {
        message: `Are you sure you want to delete '{themeName}' from your device?`,
        context: 'Confirmation of delete message.',
      },
      titleDeleteTheme: {
        message: 'Delete Theme',
        context: 'Title of window that displays when a user tries to delete a custom theme.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
