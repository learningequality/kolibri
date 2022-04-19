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
    <HeaderTabs v-if="!!windowIsLarge" data-test="header-tabs">
      <HeaderTab
        v-if="topics.length"
        :text="coreString('folders')"
        :to="foldersLink"
      />
      <HeaderTab
        :text="coreString('searchLabel')"
        :to="topics.length ? searchTabLink : {} "
      />
    </HeaderTabs>
  </div>

</template>


<script>

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import KBreadcrumbs from 'kolibri-design-system/lib/KBreadcrumbs';
  import TextTruncator from 'kolibri.coreVue.components.TextTruncator';
  import { PageNames } from '../../constants';
  import CardThumbnail from '../ContentCard/CardThumbnail';
  import HeaderTabs from './HeaderTabs';
  import HeaderTab from './HeaderTab';

  export default {
    name: 'Header',
    components: {
      CardThumbnail,
      HeaderTab,
      HeaderTabs,
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

</style>
