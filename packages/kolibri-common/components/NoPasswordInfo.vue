<template>

  <div class="no-password-info">
    <span
      class="no-password-title"
      :style="{ color: $themeTokens.text }"
    >{{ noPicturePasswordDescription$() }}</span>
    <span
      class="no-password-subtitle"
      :style="{ color: $themeTokens.annotation }"
    >{{ noPasswordSignInDescription$() }}</span>
  </div>

</template>


<script>

  import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';

  export default {
    name: 'NoPasswordInfo',
    setup() {
      const { noPicturePasswordDescription$, noPasswordSignInDescription$ } =
        picturePasswordStrings;
      return { noPicturePasswordDescription$, noPasswordSignInDescription$ };
    },
  };

</script>


<style lang="scss" scoped>

  .no-password-info {
    display: flex;
    flex-direction: column;
    justify-content: center;
    width: 165px;
    min-height: 64px;
  }

  .no-password-title {
    padding-bottom: 4px;
    font-size: 14px;
  }

  .no-password-subtitle {
    font-size: 12px;
  }

</style>
