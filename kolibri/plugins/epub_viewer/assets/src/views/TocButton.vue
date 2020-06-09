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
      toggleTocSideBar: 'Toggle table of contents',
    },
  };

</script>


<style lang="scss" scoped></style>
