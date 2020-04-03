<template>

  <KIconButton
    icon="search"
    :ariaLabel="$tr('toggleSearchSideBar')"
    data-test="search button"
    size="small"
    @click="$emit('click')"
  />

</template>


<script>

  export default {
    name: 'SearchButton',
    $trs: {
      toggleSearchSideBar: 'Toggle search',
    },
  };

</script>


<style lang="scss" scoped></style>
