<template>

  <div>
    <nav class="breadcrumbs">
      <div v-show="collapsedCrumbs.length" class="breadcrumbs-dropdown-wrapper">
        <ui-icon-button :has-dropdown="true" icon="expand_more" size="small">
          <div slot="dropdown" class="breadcrumbs-dropdown">
            <ol class="breadcrumbs-dropdown-items">
              <li v-for="crumb in collapsedCrumbs" class="breadcrumbs-dropdown-item">
                <router-link :to="crumb.link" :style="{ maxWidth: `${collapsedCrumbMaxWidth}px` }">
                  {{ crumb.text }}
                </router-link>
              </li>
            </ol>
          </div>
        </ui-icon-button>
      </div>

      <ol class="breadcrumbs-visible-items">
        <template v-for="(crumb, index) in crumbs">
          <li
            v-if="index !== crumbs.length - 1"
            class="breadcrumbs-visible-item breadcrumbs-visible-item-notlast"
            v-show="!crumb.collapsed"
          >
            <router-link :to="crumb.link">{{ crumb.text }}</router-link>
          </li>

          <li
            v-else
            class="breadcrumbs-visible-item breadcrumb-visible-item-last"
          >
            <span :style="{ maxWidth: `${lastCrumbMaxWidth}px` }">{{ crumb.text }}</span>
          </li>
        </template>
      </ol>
    </nav>


    <!-- This is a duplicate of breacrumbs-visible-items to help to reference sizes. -->
    <div class="breadcrumbs breadcrumbs-offscreen" aria-hidden="true">
      <ol class="breadcrumbs-visible-items">
        <template v-for="(crumb, index) in crumbs">
          <li
            v-if="index !== crumbs.length - 1"
            :ref="`crumb${index}`"
            class="breadcrumbs-visible-item breadcrumbs-visible-item-notlast"
          >
            <router-link :to="crumb.link" tabindex="-1">{{ crumb.text }}</router-link>
          </li>

          <li
            v-else
            :ref="`crumb${index}`"
            class="breadcrumbs-visible-item breadcrumb-visible-item-last"
          >
            <span :style="{ maxWidth: `${lastCrumbMaxWidth}px` }">{{ crumb.text }}</span>
          </li>
        </template>
      </ol>
    </div>
  </div>

</template>


<script>

  import ResizeSensor from 'css-element-queries/src/ResizeSensor';
  import ResponsiveElement from 'kolibri.coreVue.mixins.responsiveElement';
  import ValidateLinkObject from 'kolibri.utils.validateLinkObject';
  import filter from 'lodash/filter';
  import startsWith from 'lodash/startsWith';
  import throttle from 'lodash/throttle';
  import uiIconButton from 'keen-ui/src/UiIconButton';

  const DROPDOWN_BTN_WIDTH = 55;
  const DROPDOWN_SIDE_PADDING = 32;
  const MAX_CRUMB_WIDTH = 300;

  export default {
    $trNameSpace: 'breadcrumbs',
    mixins: [ResponsiveElement],
    components: { uiIconButton },
    props: {
      items: {
        type: Array,
        required: true,
        validator(crumbItems) {
          // Must not be empty
          if (!crumbItems.length) {
            return false;
          }
          // All must have text
          if (!crumbItems.every(crumb => Boolean(crumb.text))) {
            return false;
          }
          // All, but the last, must have a valid router link
          return crumbItems.slice(0, -1).every(crumb => ValidateLinkObject(crumb.link));
        },
      },
    },

    data: () => ({
      // Array of crumb objects.
      // Each object contains text, router-link, vue ref, a resize sensor, and it's collapsed state.
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
        if (this.collapsedCrumbs.length) {
          return Math.min(this.parentWidth - DROPDOWN_BTN_WIDTH, MAX_CRUMB_WIDTH);
        }
        return Math.min(this.parentWidth, MAX_CRUMB_WIDTH);
      },
      collapsedCrumbMaxWidth() {
        return Math.min(this.parentWidth - DROPDOWN_SIDE_PADDING, MAX_CRUMB_WIDTH);
      }
    },
    methods: {
      attachSensors() {
        this.$nextTick(() => {
          const crumbRefs = filter(this.$refs, (value, key) => startsWith(key, 'crumb'));
          this.crumbs = this.crumbs.map((crumb, index) => {
            const updatedCrumb = crumb;
            updatedCrumb.ref = crumbRefs[index];
            updatedCrumb.sensor = new ResizeSensor(updatedCrumb.ref, this.throttleUpdateCrumbs);
            return updatedCrumb;
          });
          this.updateCrumbs();
        });
      },
      detachSensors() {
        this.crumbs.forEach(crumb => {
          crumb.sensor.detach(this.throttleUpdateCrumbs);
        });
      },
      updateCrumbs() {
        const tempCrumbs = Array.from(this.crumbs);
        let lastCrumbWidth = Math.ceil(tempCrumbs.pop().ref[0].getBoundingClientRect().width);
        let remainingWidth = this.parentWidth - DROPDOWN_BTN_WIDTH - lastCrumbWidth;
        let trackingIndex = this.crumbs.length - 2;

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
          const lastCrumb = tempCrumbs.pop();
          lastCrumb.collapsed = false;
          this.crumbs.splice(trackingIndex, 1, lastCrumb);
          trackingIndex -= 1;
        }
      },
      throttleUpdateCrumbs: throttle(function updateCrumbs() {
        this.updateCrumbs();
      }, 100),
    },
    created() {
      this.crumbs = Array.from(this.items);
    },
    mounted() {
      this.attachSensors();
      this.$watch('parentWidth', this.throttleUpdateCrumbs);
    },

    beforeDestroy() {
      this.detachSensors();
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .breadcrumbs
    margin-top: 24px
    margin-bottom: 24px
    font-size: 16px
    font-weight: bold

  .breadcrumbs-dropdown-wrapper
    display: inline-block
    vertical-align: middle
    &:after
      content: '\203A'
      margin-right: 8px
      margin-left: 8px
      vertical-align: middle

  .breadcrumbs-dropdown
    padding: 16px
    font-weight: bold

  .breadcrumbs-dropdown-items
    padding: 0
    margin: 0
    list-style: none

  .breadcrumbs-dropdown-item
    display: block
    padding-top: 8px
    padding-bottom: 8px
    a
      overflow: hidden
      white-space: nowrap
      text-overflow: ellipsis
      max-width: 300px
      display: inline-block

  .breadcrumbs-visible-items
    display: inline-block
    vertical-align: middle
    margin: 0
    padding: 0
    list-style: none

  .breadcrumbs-visible-item
    display: inline-block
    vertical-align: middle
    a, span
      display: inline-block
      max-width: 300px
      overflow: hidden
      white-space: nowrap
      text-overflow: ellipsis
      vertical-align: middle

  .breadcrumbs-visible-item-notlast
    &:after
      content: '\203A'
      margin-right: 8px
      margin-left: 8px
      vertical-align: middle

  .breadcrumbs-offscreen
    position: absolute
    left: -1000em

</style>
