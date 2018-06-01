import mapValues from 'lodash/mapValues';

/**
 * Use like vuex 3's mapGetters utility
 * computed: {
 * ...mapGetters({
 *     getter1,
 *     getter2,
 *   })
 * }
 */
export function mapGetters(getters) {
  return mapValues(getters, fn => {
    return function newGetter() {
      return fn.call(this, this.$store.state);
    };
  });
}

/**
 * Use like vuex 3's mapActions utility
 * methods: {
 *   ...mapActions({
 *     action1,
 *     action2,
 *   })
 * }
 */
export function mapActions(actions) {
  return mapValues(actions, fn => {
    return function newAction(...args) {
      return fn.call(this, this.$store, ...args);
    };
  });
}
