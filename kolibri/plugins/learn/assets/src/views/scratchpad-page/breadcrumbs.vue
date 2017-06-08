<template>

  <nav class="breadcrumbs">

    <div v-if="collapsedCrumbs.length" class="breadcrumbs-dropdown-wrapper">
      <ui-icon-button :has-dropdown="true" icon="expand_more" size="small">
        <div slot="dropdown" class="breadcrumbs-dropdown" :style="{ maxWidth: `${lastCrumbMaxWidth}px` }">
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
          // Cannot be empty
          if (!items.length) {
            return false;
          }
          // All must have text
          const allHaveText = items.every(item => Boolean(item.text));
          if (!allHaveText) {
            return false;
          }

          items.pop();
          // Every item, but the last, must have a valid router link
          // return items.every(item => ValidateLinkObject(item.link));
          return true;
        },
      },
    },
    data: () => ({
      crumbs: [], // items + ref
    }),
    computed: {
      visibleCrumbs() {
        return this.crumbs.filter(crumb => crumb.collapsed === false);
      },
      collapsedCrumbs() {
        return this.crumbs.filter(crumb => crumb.collapsed === true).reverse();
      },
      parentWidth() {
        return this.elSize.width - 60;
      },
      lastCrumbMaxWidth() {
        // if (this.collapsedCrumbs.length) {
        //   const DROPDOWN_BUTTON_WIDTH = 36;
        //   return this.parentWidth - DROPDOWN_BUTTON_WIDTH;
        // }
        return this.parentWidth;
      },
    },
    methods: {
      isLastCrumb(index) {
        return index === this.visibleCrumbs.length - 1;
      },
      crumbsPromise() {
        const promise = new Promise((resolve, reject) => {
          this.$nextTick(() => {
            const crumbRefs = filter(this.$refs, (value, key) => startsWith(key, 'visibleCrumb'));
            this.crumbs = this.items.map((item, index) => {
              item.collapsed = false;
              item.ref = crumbRefs[index];
              return item;
            });
            resolve();
          });
        },
        reject => reject(reject));
        return promise;
      },
      updateCrumbs() {
        this.crumbsPromise().then(() => {
          if (!this.crumbs[0].ref) {
            return;
          }

          const tempCrumbs = Array.from(this.crumbs);
          let lastCrumbWidth = tempCrumbs.pop().ref[0].clientWidth;

          console.log('1 after');
          console.log('trulylastCrumbWidth:', lastCrumbWidth);


          let remainingWidth = this.parentWidth - lastCrumbWidth;
          console.log('first reaming width', remainingWidth);


          while (tempCrumbs.length) {
            console.log('totalWidth', this.parentWidth);
            // console.log('reamaingwidth', remainingWidth);
            if (remainingWidth <= 0) {
              tempCrumbs.forEach((crumb, index) => {
                this.crumbs[index].collapsed = true;
              });
              return;
            }
            console.log('2 before');
            lastCrumbWidth = tempCrumbs[tempCrumbs.length - 1].ref[0].clientWidth;
            console.log('2 after');
            console.log('lastCrumbWidth:', lastCrumbWidth);
            console.log(`is ${lastCrumbWidth} > ${remainingWidth}?`);
            if (lastCrumbWidth > remainingWidth) {
              tempCrumbs.forEach((crumb, index) => {
                this.crumbs[index].collapsed = true;
              });
              return;
            }
            remainingWidth -= lastCrumbWidth;
            // console.log('reamining width', lastCrumbWidth);
            tempCrumbs.pop();
          }
        });
      },
      throttleUpdateCrumbs: throttle(function updateCrumbs() {
        this.updateCrumbs();
      }, 1),
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
    list-style: none

  .breadcrumbs-visible-item
    display: inline-block

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
