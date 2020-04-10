<template>

  <KGrid>
    <KGridItem
      :layout8="{ span: 4 }"
      :layout12="{ span: 6 }"
    >
      <slot name="header">
        <h1>{{ headerText }}</h1>
      </slot>
    </KGridItem>
    <KGridItem
      :layout8="{ span: 4, alignment: 'right' }"
      :layout12="{ span: 6, alignment: 'right' }"
      class="buttons"
    >
      <slot name="options"></slot>
    </KGridItem>
  </KGrid>

</template>


<script>

  export default {
    name: 'HeaderWithOptions',
    props: {
      headerText: {
        type: String,
        required: false,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .buttons {
    margin: auto;
  }

</style>
