<template>

  <router-link
    ref="btn"
    :to="to"
    class="header-tab"
    :activeClass="activeClasses"
    :style="{ color: $coreTextAnnotation }"
    :class="defaultStyles"
  >
    <div class="inner" :style="{ borderColor: this.$coreActionNormal }">
      {{ text }}
    </div>
  </router-link>

</template>


<script>

  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';

  export default {
    name: 'HeaderTab',
    mixins: [themeMixin],
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
    data() {
      return {
        active: null,
      };
    },
    computed: {
      activeClasses() {
        // return both fixed and dynamic classes
        return `router-link-active ${this.$computedClass({ color: this.$coreActionNormal })}`;
      },
      defaultStyles() {
        return this.$computedClass({
          ':focus': this.$coreOutline,
          ':hover': {
            backgroundColor: this.$coreGrey300,
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
  }

</style>
