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
      toggleSearchSideBar: {
        message: 'Toggle search',
        context:
          "'Toggle search' refers to the button that opens and closes the search bar in the EPUB reader.\n\nSee more about this word here: https://en.wikipedia.org/wiki/Switch#Toggle_switch",
      },
    },
  };

</script>


<style lang="scss" scoped></style>
