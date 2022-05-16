<template>

  <div
    ref="header"
    class="header"
    :style="{
      backgroundColor: $themeTokens.surface,
      borderBottom: `1px solid ${$themeTokens.fineLine}`
    }"
  >
    <KGrid>
      <KGridItem
        class="breadcrumbs"
        data-test="header-breadcrumbs"
        :layout4="{ span: 4 }"
        :layout8="{ span: 8 }"
        :layout12="{ span: 12 }"
      >
        <KBreadcrumbs v-if="breadcrumbs.length" :items="breadcrumbs" />
      </KGridItem>
      <KGridItem
        :layout4="{ span: 4, alignment: 'auto' }"
        :layout8="{ span: 8, alignment: 'auto' }"
        :layout12="{ span: 12, alignment: 'auto' }"
      >
        <h1 class="title" data-test="header-title">
          <TextTruncator
            :text="topic.title"
            :maxHeight="60"
          />
        </h1>
      </KGridItem>

      <KGridItem
        v-if="topic.thumbnail"
        class="thumbnail"
        :layout4="{ span: 1 }"
        :layout8="{ span: 2 }"
        :layout12="{ span: 2 }"
      >
        <CardThumbnail
          class="thumbnail"
          :thumbnail="topic.thumbnail"
          :isMobile="windowIsSmall"
          :showTooltip="false"
          kind="channel"
          :showContentIcon="false"
        />
      </KGridItem>

      <!-- tagline or description -->
      <KGridItem
        v-if="topic.description"
        class="text"
        :layout4="{ span: topic.thumbnail ? 3 : 4, alignment: 'auto' }"
        :layout8="{ span: topic.thumbnail ? 6 : 8, alignment: 'auto' }"
        :layout12="{ span: topic.thumbnail ? 10 : 12, alignment: 'auto' }"
      >
        <TextTruncator
          :text="topic.description"
          :maxHeight="110"
        />
      </KGridItem>
    </KGrid>

    <!-- Nested tabs within the header, for toggling sidebar options -->
    <!-- large screens -->
    <div
      v-show="!$isPrint"
      class="tab-block"
      :style="{ borderBottomColor: !$isPrint ? $themeTokens.fineLine : 'transparent' }"
    >
      <router-link
        v-if="topics.length"
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

  </div>

</template>


<script>

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import KBreadcrumbs from 'kolibri-design-system/lib/KBreadcrumbs';
  import TextTruncator from 'kolibri.coreVue.components.TextTruncator';
  import { PageNames } from '../../constants';
  import CardThumbnail from '../ContentCard/CardThumbnail';

  export default {
    name: 'TopicsHeader',
    components: {
      CardThumbnail,
      KBreadcrumbs,
      TextTruncator,
    },
    mixins: [responsiveWindowMixin, commonCoreStrings],
    props: {
      topic: {
        type: Object,
        required: true,
      },
      topics: {
        type: Array,
        required: true,
      },
      breadcrumbs: {
        type: Array,
        required: true,
      },
    },
    computed: {
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

  $header-height: 324px;

  .header {
    position: relative;
    width: 100%;
    height: $header-height;
    padding-top: 16px;
    padding-bottom: 0;
    padding-left: 32px;
  }

  .title {
    margin: 8px 0 16px;
  }

  // Stolen from Coach HeaderTab(s) components
  .tab-block {
    position: absolute;
    bottom: 0;
    margin-bottom: 0;
  }

  .header-tab {
    position: relative;
    top: 9px;
    display: inline-table; // helps with vertical layout
    min-width: 64px;
    max-width: 100%;
    min-height: 36px;
    margin: 8px;
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
