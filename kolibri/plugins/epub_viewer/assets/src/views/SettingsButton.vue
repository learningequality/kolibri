<template>

  <KIconButton
    icon="tune"
    :ariaLabel="$tr('toggleSettingsSideBar')"
    data-test="settings button"
    size="small"
    @click="$emit('click')"
  />

</template>


<script>

  export default {
    name: 'SettingsButton',
    $trs: {
      toggleSettingsSideBar: 'Toggle settings',
    },
  };

</script>


<style lang="scss" scoped></style>
