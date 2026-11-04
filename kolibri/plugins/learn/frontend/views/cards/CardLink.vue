<template>

  <router-link
    :to="to"
    class="card-link"
  >
    <slot></slot>
  </router-link>

</template>


<script>

  export default {
    name: 'CardLink',
    props: {
      to: {
        type: Object,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .card-link {
    @extend %dropshadow-1dp;

    display: inline-block;
    padding: 16px;
    color: var(--tokens-text);
    text-decoration: none;
    background-color: var(--tokens-surface);
    border-radius: 8px;
    transition: box-shadow $core-time ease;

    &:hover {
      @extend %dropshadow-6dp;
    }
  }

  body[modality='keyboard'] .card-link:focus {
    outline: 3px solid var(--tokens-focusOutline);
    outline-offset: 4px;
  }

</style>
