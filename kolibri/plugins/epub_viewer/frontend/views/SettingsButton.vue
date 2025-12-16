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
      toggleSettingsSideBar: {
        message: 'Toggle settings',
        context:
          'Used to open and close the settings button where a learner can adjust things like the text size or the background color.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
