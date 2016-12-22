<template>

  <div class="link-wrapper">
    <router-link v-if="vlink" :to="vlink" :class="{active: active}" @click="blur" ref="link" class="link">
      <div class="content">
        <slot/>
      </div>
    </router-link>
    <a v-else :href="href" :class="{active: active}" @click="blur" ref="link" class="link">
      <div class="content">
        <slot/>
      </div>
    </a>
  </div>

</template>


<script>

  module.exports = {
    methods: {
      blur() {
        this.$refs.link.blur();
      },
    },
    props: {
      // Note - only pass in a vlink or an href, not both
      vlink: {
        type: Object,
      },
      href: {
        type: String,
      },
      active: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  .link-wrapper
    @media screen and (min-width: $portrait-breakpoint + 1)
      display: table-row
    @media screen and (max-width: $portrait-breakpoint)
      display: table-cell
      vertical-align: middle

  .link
    margin: 0
    padding: 6px
    text-align: center
    cursor: pointer
    @media screen and (min-width: $portrait-breakpoint + 1)
      display: table-cell
      vertical-align: middle
      width: $nav-width
      height: 125px
    @media screen and (max-width: $portrait-breakpoint)
      display: block

  .link.active
    color: $core-bg-light
    background: $core-action-normal

  .content
    display: inline-block

</style>
