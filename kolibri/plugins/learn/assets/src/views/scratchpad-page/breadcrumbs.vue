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
      <template v-for="(crumb, index) in visibleCrumbs">
        <li
          v-if="isLastCrumb(index)"
          :ref="`visibleCrumb${index}`"
          class="breadcrumbs-visible-item breadcrumb-visible-item-last"
          :style="{ maxWidth: `${lastCrumbMaxWidth}px` }">
          <strong>{{ crumb.text }}</strong>
        </li>

        <li v-else :ref="`visibleCrumb${index}`" class="breadcrumbs-visible-item breadcrumbs-visible-item-notlast">
          <router-link :to="crumb.link">{{ crumb.text }}</router-link>
        </li>
      </template>
    </ol>

  </nav>

</template>


<script>

  const ResponsiveElement = require('kolibri.coreVue.mixins.responsiveElement');
  // const ValidateLinkObject = require('kolibri.utils.validateLinkObject');
  const filter = require('lodash/filter');
  const startsWith = require('lodash/startsWith');
  const throttle = require('lodash/throttle');

  const DROPDOWN_WIDTH = 48;

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
          // return items.every(item => ValidateLinkObject(item.link));
          return true;
        },
      },
    },
    data: () => ({
      crumbs: [],
    }),
    computed: {
      visibleCrumbs() {
        return this.crumbs.filter(crumb => crumb.collapsed === false);
      },
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
      isLastCrumb(index) {
        return index === this.visibleCrumbs.length - 1;
      },
      crumbsPromise() {
        return new Promise((resolve, reject) => {
          this.$nextTick(() => {
            const crumbRefs = filter(this.$refs, (value, key) => startsWith(key, 'visibleCrumb'));
            this.crumbs = this.items.map((item, index) => {
              item.collapsed = false;
              item.ref = crumbRefs[index];
              return item;
            });
            resolve();
          });
        }, reject => reject(reject));
      },
      updateCrumbs() {
        this.crumbsPromise().then(() => {
          if (!this.crumbs[0].ref) {
            return;
          }

          const tempCrumbs = Array.from(this.crumbs);
          let lastCrumbWidth = Math.ceil(tempCrumbs.pop().ref[0].getBoundingClientRect().width);

          let remainingWidth = this.lastCrumbMaxWidth - lastCrumbWidth;

          while (tempCrumbs.length) {
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
    watch: {
      parentWidth: 'throttleUpdateCrumbs',
    },
    mounted() {
      this.updateCrumbs();
      window.addEventListener('load', this.updateCrumbs);
    },
    beforeDestroy() {
      window.removeEventListener('load', this.updateCrumbs);
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .breadcrumbs
    margin-top: 1em
    margin-bottom: 1em
    font-size: small
    background-color: white

  .breadcrumbs-dropdown-wrapper
    display: inline-block
    &:after
      content: '/'
      margin-right: 5px
      margin-left: 5px

  .breadcrumbs-dropdown
    padding: 0.5em
    font-size: small

  .breadcrumbs-dropdown-items
    padding: 0.25em
    margin: 0
    list-style: none

  .breadcrumbs-dropdown-item
    display: block
    overflow: hidden
    white-space: nowrap
    text-overflow: ellipsis
    padding-top: 0.5em
    padding-bottom: 0.5em

  .breadcrumbs-visible-items
    display: inline-block
    // vertical-align: middle
    margin: 0
    padding: 0
    list-style: none // get rid of whitespace
    font-size: 0

  .breadcrumbs-visible-item
    display: inline-block
    font-size: small

  .breadcrumbs-visible-item-notlast
    &:after
      content: '/'
      margin-right: 5px
      margin-left: 5px

  .breadcrumb-visible-item-last
    overflow: hidden
    white-space: nowrap
    text-overflow: ellipsis

</style>
