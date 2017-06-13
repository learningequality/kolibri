<template>

  <nav class="breadcrumbs">

    <div v-if="collapsedCrumbs.length" class="breadcrumbs-dropdown-wrapper">
      <ui-icon-button :has-dropdown="true" icon="expand_more" size="small">
        <div slot="dropdown" class="breadcrumbs-dropdown" :style="{ maxWidth: `${parentWidth}px` }">
          <ol class="breadcrumbs-dropdown-items">
            <li v-for="crumb in collapsedCrumbs" class="breadcrumbs-dropdown-item">
              <router-link :to="crumb.link">{{ crumb.text }}</router-link>
            </li>
          </ol>
        </div>
      </ui-icon-button>
    </div>

    <ol class="breadcrumbs-visible-items">
      <template v-for="(crumb, index) in crumbs">
        <li
          v-if="index !== crumbs.length - 1"
          :ref="`visibleCrumb${index}`"
          class="breadcrumbs-visible-item breadcrumbs-visible-item-notlast"
          :style="{ display: crumb.collapsed ? 'none' : '' }">
          <router-link :to="crumb.link">{{ crumb.text }}</router-link>
        </li>

        <li
          v-else
          :ref="`visibleCrumb${index}`"
          class="breadcrumbs-visible-item breadcrumb-visible-item-last"
          :style="{ maxWidth: `${lastCrumbMaxWidth}px` }">
          {{ crumb.text }}
        </li>
      </template>
    </ol>

  </nav>

</template>


<script>

  const ResponsiveElement = require('kolibri.coreVue.mixins.responsiveElement');
  const ValidateLinkObject = require('kolibri.utils.validateLinkObject');
  const filter = require('lodash/filter');
  const startsWith = require('lodash/startsWith');
  const throttle = require('lodash/throttle');

  const DROPDOWN_WIDTH = 55;
  const BREADCRUMBS_PADDING = 0; // pulled from style

  module.exports = {
    mixins: [ResponsiveElement],
    $trNameSpace: 'breadcrumbs',
    components: {
      'ui-icon-button': require('keen-ui/src/UiIconButton'),
    },
    props: {
      items: {
        type: Array,
        required: true,
        validator(items) {
          const crumbs = Array.from(items);
          // Must not be empty
          if (!crumbs.length) {
            return false;
          }
          // All must have text
          if (!crumbs.every(crumb => Boolean(crumb.text))) {
            return false;
          }
          crumbs.pop();
          // All, but the last, must have a valid router link
          return crumbs.every(item => ValidateLinkObject(item.link));
        },
      },
    },
    data: () => ({
      crumbs: [],
    }),
    computed: {
      collapsedCrumbs() {
        return this.crumbs.filter(crumb => crumb.collapsed === true).reverse();
      },
      parentWidth() {
        return this.elSize.width - BREADCRUMBS_PADDING;
      },
      lastCrumbMaxWidth() {
        return this.parentWidth - DROPDOWN_WIDTH;
      },
    },
    methods: {
      updateCrumbs() {
        this.$nextTick(() => {
          const crumbRefs = filter(this.$refs, (value, key) => startsWith(key, 'visibleCrumb'));
          this.crumbs = this.crumbs.map((item, index) => {
            item.collapsed = false;
            item.ref = crumbRefs[index];
            return item;
          });

          const tempCrumbs = Array.from(this.crumbs);
          let lastCrumbWidth = Math.ceil(tempCrumbs.pop().ref[0].getBoundingClientRect().width);
          let remainingWidth = this.lastCrumbMaxWidth - lastCrumbWidth;

          while (tempCrumbs.length) {
            console.log('lastCrumbWidth', lastCrumbWidth);
            if (remainingWidth <= 0) {
              tempCrumbs.forEach((crumb, index) => {
                this.crumbs[index].collapsed = true;
              });
              return;
            }

            lastCrumbWidth = Math.ceil(
              tempCrumbs[tempCrumbs.length - 1].ref[0].getBoundingClientRect().width);

            if (lastCrumbWidth > remainingWidth) {
              tempCrumbs.forEach((crumb, index) => {
                this.crumbs[index].collapsed = true;
              });
              return;
            }

            remainingWidth -= lastCrumbWidth;
            tempCrumbs.pop();
          }
        });
      },
      throttleUpdateCrumbs: throttle(function updateCrumbs() {
        this.updateCrumbs();
      }, 250),
    },
    created() {
      this.crumbs = Array.from(this.items);
    },
    mounted() {
      this.updateCrumbs();
      window.addEventListener('load', this.updateCrumbs);
      this.$watch('parentWidth', this.throttleUpdateCrumbs);
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .breadcrumbs
    margin-top: 16px
    margin-bottom: 16px
    font-size: 16px
    font-weight: bold

  .breadcrumbs-dropdown-wrapper
    display: inline-block
    &:after
      content: '\203A'
      margin-right: 8px
      margin-left: 8px

  .breadcrumbs-dropdown
    padding: 8px
    font-size: 16px
    font-weight: bold

  .breadcrumbs-dropdown-items
    padding: 0
    margin: 0
    list-style: none

  .breadcrumbs-dropdown-item
    display: block
    overflow: hidden
    white-space: nowrap
    text-overflow: ellipsis
    padding-top: 8px
    padding-bottom: 8px
    a
      display: inline-block

  .breadcrumbs-visible-items
    display: inline-block
    vertical-align: middle
    margin: 0
    padding: 0
    list-style: none // get rid of whitespace
    font-size: 0

  .breadcrumbs-visible-item
    // max-width: 250px
    overflow: hidden
    white-space: nowrap
    text-overflow: ellipsis
    display: inline-block
    font-size: 16px
    vertical-align: middle
    a
      display: inline-block

  .breadcrumbs-visible-item-notlast
    &:after
      content: '\203A'
      margin-right: 8px
      margin-left: 8px

  .breadcrumb-visible-item-last
    overflow: hidden
    white-space: nowrap
    text-overflow: ellipsis

</style>
