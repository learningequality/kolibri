<template>

  <router-link
    ref="btn"
    :to="to"
    class="button"
    :activeClass="activeStyles"
    :style="{ color: $coreTextAnnotation }"
    :class="[defaultStyles, $computedClass({ ':focus': $coreOutline })]"
  >
    {{ text }}
  </router-link>

</template>


<script>

  import { mapGetters } from 'vuex';

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
    data() {
      return {
        active: null,
      };
    },
    computed: {
      ...mapGetters(['$coreActionNormal', '$coreTextAnnotation', '$coreGrey300', '$coreOutline']),
      activeStyles() {
        return this.$computedClass({
          borderColor: this.$coreActionNormal,
          color: this.$coreActionNormal,
          borderBottomWidth: '2px',
        });
      },
      defaultStyles() {
        return this.$computedClass({
          ':hover': {
            backgroundColor: this.$coreGrey300,
          },
        });
      },
    },
  };

</script>


<style lang="scss" scoped>

  // a lot copied from KButton
  .button {
    position: relative;
    top: 9px;
    display: inline-table; // helps with vertical layout
    min-width: 64px;
    max-width: 100%;
    min-height: 36px;
    padding: 0 16px;
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
    border-radius: 0;
    outline: none;
  }

</style>
