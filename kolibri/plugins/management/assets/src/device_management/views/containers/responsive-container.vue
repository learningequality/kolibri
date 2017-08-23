<template>

  <div class="no-padding" :class="containerClasses">
    <slot />
  </div>

</template>


<script>

  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import forEach from 'lodash/forEach';

  const breakpoints = ['b1',' b2', 'b3', 'b4', 'b5', 'b6', 'b7'];

  export default {
    mixins: [responsiveWindow],
    props: [...breakpoints, 'default'],
    computed: {
      containerClasses() {
        let classes = [];
        // not efficient since loops over all breakpoints
        forEach(breakpoints, (bp, idx) => {
          if (this[bp] && this.windowSize.breakpoint > idx + 1) {
            classes.push(this[bp]);
          }
        });
        if (classes.length == 0) {
          return this['default'];
        }
        return classes;
      }
    },
  }

</script>


<style lang="stylus" scoped>

  .no-padding
    padding: 0

</style>
