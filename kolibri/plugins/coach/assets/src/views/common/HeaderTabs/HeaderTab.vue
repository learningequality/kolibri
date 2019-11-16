<template>

  <router-link
    ref="btn"
    :to="to"
    class="header-tab"
    :activeClass="activeClasses"
    :style="{ color: $themeTokens.annotation }"
    :class="defaultStyles"
  >
    <div class="inner" :style="{ borderColor: this.$themeTokens.primary }">
      {{ text }}
    </div>
  </router-link>

</template>


<script>

  export default {
    name: 'HeaderTab',
    props: {
      text: {
        type: String,
        required: true,
      },
      to: {
        type: Object,
        required: true,
      },
    },
    computed: {
      activeClasses() {
        // return both fixed and dynamic classes
        return `router-link-active ${this.$computedClass({ color: this.$themeTokens.primary })}`;
      },
      defaultStyles() {
        return this.$computedClass({
          ':focus': this.$coreOutline,
          ':hover': {
            backgroundColor: this.$themePalette.grey.v_300,
          },
        });
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  // a lot copied from KButton
  .header-tab {
    position: relative;
    top: 9px;
    display: inline-table; // helps with vertical layout
    min-width: 64px;
    max-width: 100%;
    min-height: 36px;
    margin: 8px;
    overflow: hidden;
    font-size: 14px;
    font-weight: bold;
    line-height: 36px;
    text-align: center;
    text-decoration: none;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
    border: 0;
    border-style: solid;
    border-width: 0;
    border-top-left-radius: $radius;
    border-top-right-radius: $radius;
    outline: none;
    transition: background-color $core-time ease;

    @media print {
      min-width: 0;
      min-height: 0;
      margin: 0;
      font-size: inherit;
      line-height: inherit;
      text-align: left;
      text-transform: none;

      &:not(.router-link-active) {
        display: none;
      }
    }
  }

  .inner {
    padding: 0 16px;
    margin-bottom: 2px;
    border-style: solid;
    border-width: 0;
  }

  .router-link-active .inner {
    margin-bottom: 0;
    border-bottom-width: 2px;

    @media print {
      padding: 0;
      border-bottom-width: 0;
    }
  }

</style>
