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

    &:focus {
      outline: 4px solid var(--tokens-primary);
      outline-offset: 2px;
    }
  }

</style>
