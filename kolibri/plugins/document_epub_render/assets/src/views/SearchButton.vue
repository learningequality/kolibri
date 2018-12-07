<template>

  <UiIconButton
    type="secondary"
    :disableRipple="true"
    :ariaLabel="$tr('toggleSearchSideBar')"
    data-test="search button"
    @click="$emit('click')"
  >
    <mat-svg
      name="search"
      category="action"
    />
  </UiIconButton>

</template>


<script>

  import UiIconButton from 'keen-ui/src/UiIconButton';

  export default {
    name: 'SearchButton',
    $trs: {
      toggleSearchSideBar: 'Toggle search side bar',
    },
    components: {
      UiIconButton,
    },
  };

</script>


<style lang="scss" scoped></style>
