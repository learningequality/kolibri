<template>

  <UiIconButton
    type="secondary"
    :ariaLabel="$tr('toggleSettingsSideBar')"
    data-test="settings button"
    @click="$emit('click')"
  >
    <KIcon
      icon="tune"
      style="top: 0; width: 24px; height: 24px;"
    />
  </UiIconButton>

</template>


<script>

  import UiIconButton from 'kolibri-design-system/lib/keen/UiIconButton';

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
