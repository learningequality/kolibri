<template>

  <div
    v-show="!$isPrint"
    class="tab-block"
    :style="{
      borderBottomColor: !$isPrint ? $themeTokens.fineLine : 'transparent',
    }"
  >
    <router-link
      v-if="topics.length && windowIsLarge"
      :to="foldersLink"
      class="header-tab"
      :activeClass="activeTabClasses"
      :style="{ color: $themeTokens.annotation }"
      :replace="true"
      :class="defaultTabStyles"
    >
      <div class="inner" :style="{ borderColor: this.$themeTokens.primary }">
        {{ coreString('folders') }}
      </div>
    </router-link>

    <router-link
      v-if="windowIsLarge"
      :to="topics.length ? searchTabLink : {}"
      class="header-tab"
      :activeClass="activeTabClasses"
      :style="{ color: $themeTokens.annotation }"
      :replace="true"
      :class="defaultTabStyles"
    >
      <div class="inner" :style="{ borderColor: this.$themeTokens.primary }">
        {{ coreString('searchLabel') }}
      </div>
    </router-link>
  </div>

</template>


<script>

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { PageNames } from '../../constants';

  export default {
    name: 'ToggleHeaderTabs',
    mixins: [responsiveWindowMixin, commonCoreStrings],
    props: {
      topic: {
        type: Object,
        required: true,
      },
      topics: {
        type: Array,
        default() {
          return [];
        },
      },
    },
    computed: {
      // for folder and search tabs
      activeTabClasses() {
        // return both fixed and dynamic classes
        return `router-link-active ${this.$computedClass({ color: this.$themeTokens.primary })}`;
      },
      defaultTabStyles() {
        return this.$computedClass({
          ':focus': this.$coreOutline,
          ':hover': {
            backgroundColor: this.$themePalette.grey.v_300,
          },
        });
      },
      foldersLink() {
        if (this.topic) {
          return {
            name: PageNames.TOPICS_TOPIC,
            id: this.topic.id,
          };
        }
        return {};
      },
      searchTabLink() {
        // navigates the main page to the search view
        if (this.topic) {
          const query = { ...this.$route.query };
          delete query.dropdown;
          return {
            name: PageNames.TOPICS_TOPIC_SEARCH,
            id: this.topic.id,
            query: query,
          };
        }
        return {};
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  // Stolen from Coach HeaderTab(s) components
  .tab-block {
    position: fixed;
    top: 324px;
  }

  .header-tab {
    display: inline-table; // helps with vertical layout
    min-width: 64px;
    max-width: 100%;
    min-height: 36px;
    margin-left: 24px;
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
    border-top-left-radius: $radius;
    border-top-right-radius: $radius;
    outline: none;
    transition: background-color $core-time ease;

    @media print {
      min-width: 0;
      min-height: 0;
      margin: 0;
      font-size: inherit;
      line-height: inherit;
      text-align: left;
      text-transform: none;

      &:not(.router-link-active) {
        display: none;
      }
    }
  }

  .search-panel {
    margin: 24px;
  }

  .inner {
    padding: 16px;
    margin-bottom: 2px;
    border-style: solid;
    border-width: 0;
  }

  .router-link-active .inner {
    margin-bottom: 0;
    border-bottom-width: 2px;

    @media print {
      padding: 0;
      border-bottom-width: 0;
    }
  }

</style>
