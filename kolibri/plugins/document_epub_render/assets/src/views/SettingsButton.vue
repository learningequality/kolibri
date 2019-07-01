<template>

  <UiIconButton
    type="secondary"
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

  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';

  export default {
    name: 'SettingsButton',
    components: {
      UiIconButton,
    },
    $trs: {
      toggleSettingsSideBar: 'Toggle settings',
    },
  };

</script>


<style lang="scss" scoped></style>
