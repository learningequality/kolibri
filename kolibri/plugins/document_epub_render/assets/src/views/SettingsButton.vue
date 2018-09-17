<template>

  <UiIconButton
    type="secondary"
    :disableRipple="true"
    :ariaLabel="$tr('toggleSettingsSideBar')"
    data-test="settings button"
    @click="$emit('click')"
  >
    <mat-svg
      name="tune"
      category="image"
    />
  </UiIconButton>

</template>


<script>

  import UiIconButton from 'keen-ui/src/UiIconButton';

  export default {
    name: 'SettingsButton',
    $trs: {
      toggleSettingsSideBar: 'Toggle settings side bar',
    },
    components: {
      UiIconButton,
    },
  };

</script>


<style lang="scss" scoped></style>
