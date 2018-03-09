/*
  Apply this mixin to your vue components to get helpers for setting pure-grid classes.

  For example:

    <script>

      import pureGrid from 'kolibri.coreVue.mixins.pureGrid';

      export default {
        mixins: [pureGrid],
        props: {
    ...

  This adds a new `pg` method to your vue model which returns a pure grid unit class:

      pg(size, granularity)

  returns the class: `pure-u-${size}-${granularity}`

  See pure grid docs for details: https://purecss.io/grids/
*/

export default {
  methods: {
    pg(size, granularity) {
      return `pure-u-${size}-${granularity}`;
    },
  },
};
