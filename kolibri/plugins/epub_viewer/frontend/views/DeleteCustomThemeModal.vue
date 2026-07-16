<template>

  <KModal
    :title="titleDeleteTheme$()"
    :submitText="coreString('deleteAction')"
    :cancelText="coreString('cancelAction')"
    @submit="$emit('submit')"
    @cancel="$emit('cancel')"
  >
    <p v-if="themeName">
      {{ confirmationQuestion$({ themeName }) }}
    </p>
    <p>{{ coreString('cannotUndoActionWarning') }}</p>
  </KModal>

</template>


<script>

  import { coreString } from 'kolibri/uiText/commonCoreStrings';
  import { customThemeStrings } from './customThemeStrings';

  export default {
    name: 'DeleteCustomThemeModal',
    setup() {
      const { confirmationQuestion$, titleDeleteTheme$ } = customThemeStrings;
      return {
        coreString,
        confirmationQuestion$,
        titleDeleteTheme$,
      };
    },
    props: {
      themeName: {
        type: String,
        default: null,
      },
    },
  };

</script>


<style lang="scss" scoped></style>
