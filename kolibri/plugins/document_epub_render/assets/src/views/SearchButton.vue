<template>

  <UiIconButton
    type="secondary"
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

  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';

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
