<template>

  <KIconButton
    icon="list"
    :ariaLabel="$tr('toggleTocSideBar')"
    data-test="toc button"
    size="small"
    @click="$emit('click')"
  />

</template>


<script>

  export default {
    name: 'TocButton',
    $trs: {
      toggleTocSideBar: {
        message: 'Toggle table of contents',
        context:
          'Learners can use the list button in the upper left corner to view the table of contents with all the book chapters.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
