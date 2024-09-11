<template>

  <router-link
    :to="to"
    class="card-link"
    :class="themeClasses.link"
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
    computed: {
      themeClasses() {
        const { surface, text } = this.$themeTokens;
        return {
          link: this.$computedClass({
            ':focus': this.$coreOutline,
            color: text,
            backgroundColor: surface,
          }),
        };
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
    text-decoration: none;
    border-radius: 8px;
    transition: box-shadow $core-time ease;

    &:hover {
      @extend %dropshadow-6dp;
    }
  }

</style>
