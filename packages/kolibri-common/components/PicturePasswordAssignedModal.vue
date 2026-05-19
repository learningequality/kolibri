<template>

  <KModal
    :title="picturePasswordAssignedTitle$()"
    :submitText="coreString('continueAction')"
    :submitDisabled="!isConfirmed"
    :cancelDisabled="true"
    @submit="handleAction"
  >
    <p class="modal-block">{{ picturePasswordAssignedDescription$() }}</p>
    <UserPicturePassword
      class="picture-password"
      :picturePassword="picturePassword"
      iconSize="60px"
    />
    <p class="modal-block">{{ picturePasswordAssignedAddendum$() }}</p>
    <KCheckbox
      data-testid="continue-checkbox"
      :label="readyToContinue$()"
      :checked="isConfirmed"
      @change="isConfirmed = !isConfirmed"
    />
  </KModal>

</template>


<script>

  import { ref } from 'vue';
  import { coreString } from 'kolibri/uiText/commonCoreStrings';
  import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';
  import UserPicturePassword from './UserPicturePassword';

  export default {
    name: 'PicturePasswordAssignedModal',
    components: {
      UserPicturePassword,
    },
    setup(_, { emit }) {
      const {
        picturePasswordAssignedTitle$,
        picturePasswordAssignedDescription$,
        picturePasswordAssignedAddendum$,
        readyToContinue$,
      } = picturePasswordStrings;
      const isConfirmed = ref(false);

      function handleAction() {
        if (!isConfirmed.value) {
          return;
        }
        emit('confirm');
      }

      return {
        coreString,
        picturePasswordAssignedTitle$,
        picturePasswordAssignedDescription$,
        picturePasswordAssignedAddendum$,
        readyToContinue$,
        isConfirmed,
        handleAction,
      };
    },
    props: {
      picturePassword: {
        type: String,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .modal-block {
    margin-top: 0;
    margin-bottom: 24px;
  }

  .picture-password {
    width: 204px;
    margin: 0 auto 30px;
  }

</style>
