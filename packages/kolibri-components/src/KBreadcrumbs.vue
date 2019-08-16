<template>

  <div v-show="showSingleItem || crumbs.length > 1">
    <nav class="breadcrumbs">
      <div v-show="collapsedCrumbs.length" class="breadcrumbs-dropdown-wrapper">
        <UiIconButton :hasDropdown="true" size="small">
          <mat-svg
            name="expand_more"
            category="navigation"
          />
          <div slot="dropdown" class="breadcrumbs-dropdown">
            <ol class="breadcrumbs-dropdown-items">
              <li
                v-for="(crumb, index) in collapsedCrumbs"
                :key="index"
                class="breadcrumbs-dropdown-item"
              >
                <KRouterLink
                  :text="crumb.text"
                  :to="crumb.link"
                  :style="{ maxWidth: `${collapsedCrumbMaxWidth}px` }"
                  dir="auto"
                />
              </li>
            </ol>
          </div>
        </UiIconButton>
      </div>

      <ol class="breadcrumbs-visible-items">
        <template v-for="(crumb, index) in crumbs">
          <li
            v-if="index !== crumbs.length - 1"
            v-show="!crumb.collapsed"
            :key="index"
            class="breadcrumbs-visible-item breadcrumbs-visible-item-notlast"
          >
            <KRouterLink
              :text="crumb.text"
              :to="crumb.link"
              dir="auto"
            />
          </li>

          <li
            v-else
            :key="index"
            class="breadcrumbs-visible-item breadcrumb-visible-item-last"
          >
            <span
              :style="{ maxWidth: `${lastCrumbMaxWidth}px` }"
              dir="auto"
            >
              {{ crumb.text }}
            </span>
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
            :key="index"
            class="breadcrumbs-visible-item breadcrumbs-visible-item-notlast"
          >
            <KRouterLink :text="crumb.text" :to="crumb.link" tabindex="-1" />
          </li>

          <li
            v-else
            :ref="`crumb${index}`"
            :key="index"
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
  import KResponsiveElementMixin from 'kolibri-components/src/KResponsiveElementMixin';
  import { validateLinkObject } from 'kolibri.utils.validators';
  import filter from 'lodash/filter';
  import startsWith from 'lodash/startsWith';
  import throttle from 'lodash/throttle';
  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';

  const DROPDOWN_BTN_WIDTH = 55;
  const DROPDOWN_SIDE_PADDING = 32; // pulled from .breadcrumbs-dropdown
  const MAX_CRUMB_WIDTH = 300; // pulled from .breadcrumbs-visible-item class

  /**
   * Used to aid deeply nested navigation of content channels, topics, and resources
   */
  export default {
    name: 'KBreadcrumbs',
    components: { UiIconButton },
    mixins: [KResponsiveElementMixin],
    props: {
      /**
       * An array of objects, each with a 'text' attribute (String) and a
       * 'link' attribute (vue router link object). The 'link' attribute
       * of the last item in the array is optional and ignored.
       */
      items: {
        type: Array,
        required: true,
        validator(crumbItems) {
          // All must have text
          if (!crumbItems.every(crumb => Boolean(crumb.text))) {
            return false;
          }
          // All, but the last, must have a valid router link
          return crumbItems.slice(0, -1).every(crumb => validateLinkObject(crumb.link));
        },
      },
      /**
       * By default, the breadcrums will be hidden when the length of items is 1.
       * When set to 'true', a breadcrumb will be shown even when there is only one.
       */
      showSingleItem: {
        type: Boolean,
        default: false,
      },
    },

    data: () => ({
      // Array of crumb objects.
      // Each object contains:
      // text, router-link 'to' object, vue ref, a resize sensor, and its collapsed state
      crumbs: [],
    }),
    computed: {
      collapsedCrumbs() {
        return this.crumbs.filter(crumb => crumb.collapsed === true).reverse();
      },
      parentWidth() {
        return this.elementWidth;
      },
      lastCrumbMaxWidth() {
        if (this.collapsedCrumbs.length) {
          return Math.min(this.parentWidth - DROPDOWN_BTN_WIDTH, MAX_CRUMB_WIDTH);
        }
        return Math.min(this.parentWidth, MAX_CRUMB_WIDTH);
      },
      collapsedCrumbMaxWidth() {
        return Math.min(this.parentWidth - DROPDOWN_SIDE_PADDING, MAX_CRUMB_WIDTH);
      },
    },
    watch: {
      items(val) {
        this.crumbs = Array.from(val);
        this.attachSensors();
      },
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
        if (this.crumbs.length) {
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
              tempCrumbs[tempCrumbs.length - 1].ref[0].getBoundingClientRect().width
            );

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
        }
      },
      throttleUpdateCrumbs: throttle(function updateCrumbs() {
        this.updateCrumbs();
      }, 100),
    },
  };

</script>


<style lang="scss" scoped>

  .breadcrumbs {
    margin-top: 8px;
    margin-bottom: 8px;
    font-size: 16px;
    font-weight: bold;
  }

  .breadcrumbs-dropdown-wrapper {
    display: inline-block;
    vertical-align: middle;
    &::after {
      margin-right: 8px;
      margin-left: 8px;
      vertical-align: middle;
      content: '›';
    }
  }

  .breadcrumbs-dropdown {
    padding: 16px;
    font-weight: bold;
  }

  .breadcrumbs-dropdown-items {
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .breadcrumbs-dropdown-item {
    display: block;
    padding-top: 8px;
    padding-bottom: 8px;
    a {
      display: inline-block;
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .breadcrumbs-visible-items {
    display: inline-block;
    padding: 0;
    margin: 0;
    vertical-align: middle;
    list-style: none;
  }

  .breadcrumbs-visible-item {
    display: inline-block;
    vertical-align: middle;
    a,
    span {
      display: inline-block;
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      vertical-align: middle;
    }
  }

  .breadcrumbs-visible-item-notlast {
    &::after {
      margin-right: 8px;
      margin-left: 8px;
      vertical-align: middle;
      content: '›';
    }
  }

  .breadcrumbs-offscreen {
    position: absolute;
    left: -1000em;
  }

</style>
