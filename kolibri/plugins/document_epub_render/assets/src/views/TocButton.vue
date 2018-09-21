<template>

  <UiIconButton
    type="secondary"
    :disableRipple="true"
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

  import UiIconButton from 'keen-ui/src/UiIconButton';

  export default {
    name: 'TocButton',
    $trs: {
      toggleTocSideBar: 'Toggle table of contents side bar',
    },
    components: {
      UiIconButton,
    },
  };

</script>


<style lang="scss" scoped></style>
