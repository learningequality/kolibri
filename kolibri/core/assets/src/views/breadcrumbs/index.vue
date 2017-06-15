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
          :ref="`crumb${index}`"
          class="breadcrumbs-visible-item breadcrumbs-visible-item-notlast"
          v-show="!crumb.collapsed"
         >
          <router-link :to="crumb.link">{{ crumb.text }}</router-link>
        </li>

        <li
          v-else
          :ref="`crumb${index}`"
          class="breadcrumbs-visible-item breadcrumb-visible-item-last"
          :style="{ maxWidth: `${lastCrumbMaxWidth}px` }">
          {{ crumb.text }}
        </li>
      </template>
    </ol>

  </nav>

</template>


<script>

  const ResizeSensor = require('css-element-queries/src/ResizeSensor');
  const ResponsiveElement = require('kolibri.coreVue.mixins.responsiveElement');
  const ValidateLinkObject = require('kolibri.utils.validateLinkObject');
  const filter = require('lodash/filter');
  const startsWith = require('lodash/startsWith');
  const throttle = require('lodash/throttle');

  const DROPDOWN_WIDTH = 55;

  module.exports = {
    $trNameSpace: 'breadcrumbs',

    mixins: [ResponsiveElement],

    components: {
      'ui-icon-button': require('keen-ui/src/UiIconButton'),
    },

    props: {
      items: {
        type: Array,
        required: true,
        validator(crumbItems) {
          console.log('validating');
          const crumbs = Array.from(crumbItems);
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
          return crumbs.every(crumb => ValidateLinkObject(crumb.link));
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
        return this.elSize.width;
      },

      lastCrumbMaxWidth() {
        return this.parentWidth - DROPDOWN_WIDTH;
      },
    },

    methods: {
      resetCollapsedState() {
        this.crumbs = this.crumbs.map(crumb => {
          const updatedCrumb = crumb;
          updatedCrumb.collapsed = false;
          return updatedCrumb;
        });
      },

      attachSensors() {
        this.$nextTick(() => {
          const crumbRefs = filter(this.$refs, (value, key) => startsWith(key, 'crumb'));
          this.crumbs = this.crumbs.map((crumb, index) => {
            const updatedCrumb = crumb;
            updatedCrumb.ref = crumbRefs[index];
            updatedCrumb.sensor = new ResizeSensor(updatedCrumb.ref, () => {
              this.updateCrumbs();
            });
            return updatedCrumb;
          });
        });
      },

      updateCrumbs() {
        // reset collapsed values
        this.resetCollapsedState();

        // wait until next tick so that collapsed crumbs are uncollapsed
        this.$nextTick(() => {
          const tempCrumbs = Array.from(this.crumbs);
          let lastCrumbWidth = Math.ceil(tempCrumbs.pop().ref[0].getBoundingClientRect().width);
          let remainingWidth = this.lastCrumbMaxWidth - lastCrumbWidth;
          while (tempCrumbs.length) {
            if (remainingWidth <= 0) {
              tempCrumbs.forEach((crumb, index) => {
                const updatedCrumb = crumb;
                updatedCrumb.collapsed = true;
                this.crumbs.splice(index, 1, updatedCrumb);
              });
              break;
            }

            lastCrumbWidth = Math.ceil(
              tempCrumbs[tempCrumbs.length - 1].ref[0].getBoundingClientRect().width);
            if (lastCrumbWidth > remainingWidth) {
              tempCrumbs.forEach((crumb, index) => {
                const updatedCrumb = crumb;
                updatedCrumb.collapsed = true;
                this.crumbs.splice(index, 1, updatedCrumb);
              });
              break;
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
      this.resetCollapsedState();
    },

    mounted() {
      this.attachSensors();
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
    list-style: none

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
