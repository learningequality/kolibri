<template>

  <UiIconButton
    type="secondary"
    :ariaLabel="$tr('toggleTocSideBar')"
    data-test="toc button"
    @click="$emit('click')"
  >
    <mat-svg
      name="list"
      category="action"
    />
  </UiIconButton>

</template>


<script>

  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';

  export default {
    name: 'TocButton',
    components: {
      UiIconButton,
    },
    $trs: {
      toggleTocSideBar: 'Toggle table of contents',
    },
  };

</script>


<style lang="scss" scoped></style>
