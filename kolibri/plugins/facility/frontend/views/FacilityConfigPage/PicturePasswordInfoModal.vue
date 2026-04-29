<template>

  <KModal
    :title="picturePasswordInfoLabel$()"
    :submitText="coreString('closeAction')"
    @submit="$emit('close')"
    @cancel="$emit('close')"
  >
    <p>{{ picturePasswordInfoIntro$() }}</p>
    <p>{{ picturePasswordInfoBody$() }}</p>
    <p>{{ picturePasswordInfoNote$() }}</p>

    <KImg
      isDecorative
      :src="picturePasswordSvg"
      backgroundColor="transparent"
      class="example-image"
    />
  </KModal>

</template>


<script>

  import { coreString } from 'kolibri/uiText/commonCoreStrings';
  import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';
  import picturePasswordSvg from '../../images/picture_password.svg';

  export default {
    name: 'PicturePasswordInfoModal',
    setup() {
      const {
        picturePasswordInfoLabel$,
        picturePasswordInfoIntro$,
        picturePasswordInfoBody$,
        picturePasswordInfoNote$,
      } = picturePasswordStrings;

      return {
        coreString,
        picturePasswordSvg,
        picturePasswordInfoLabel$,
        picturePasswordInfoIntro$,
        picturePasswordInfoBody$,
        picturePasswordInfoNote$,
      };
    },
  };

</script>


<style lang="scss" scoped>

  .example-image {
    width: 100%;
    margin-top: 32px;
  }

</style>
