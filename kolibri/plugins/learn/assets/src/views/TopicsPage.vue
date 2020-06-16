<template>

  <div class="wrapper" :style="{ marginTop: windowIsSmall ? '340px' : '280px' }">

    <div class="hero-heading">

      <KGrid>
        <KGridItem
          class="breadcrumbs"
          :layout4="{ span: 4 }"
          :layout8="{ span: 8 }"
          :layout12="{ span: 12 }"
        >
          <slot name="breadcrumbs"></slot>
        </KGridItem>

        <KGridItem
          class="title"
          :layout4="{ span: 4 }"
          :layout8="{ span: 8 }"
          :layout12="{ span: 12 }"
        >
          <h3>
            <TextTruncator
              :text="topicOrChannel.title"
              :maxHeight="90"
              :showTooltip="false"
              dir="auto"
            />
          </h3>
        </KGridItem>

        <KGridItem
          v-if="topicOrChannel['thumbnail']"
          class="thumbnail"
          :layout4="{ span: 1 }"
          :layout8="{ span: 2 }"
          :layout12="{ span: 2 }"
        >
          <CardThumbnail
            class="thumbnail"
            :thumbnail="topicOrChannel['thumbnail']"
            :isMobile="windowIsSmall"
            :showTooltip="false"
            kind="channel"
            :showContentIcon="false"
          />
        </KGridItem>

        <!-- tagline or description -->
        <KGridItem
          v-if="getTagline"
          class="text"
          :layout4="{ span: topicOrChannel['thumbnail'] ? 3 : 4 }"
          :layout8="{ span: topicOrChannel['thumbnail'] ? 6 : 8 }"
          :layout12="{ span: topicOrChannel['thumbnail'] ? 10 : 12 }"
        >
          <TextTruncator
            :text="getTagline"
            :maxHeight="100"
            :showTooltip="false"
            dir="auto"
          />
        </KGridItem>

        <KGridItem
          class="footer"
          :layout4="{ span: 4 }"
          :layout8="{ span: 8 }"
          :layout12="{ span: 12 }"
        >
          <ProgressIcon
            v-if="calculateProgress !== undefined"
            class="progress-icon"
            :progress="calculateProgress"
          />
        </KGridItem>
      </KGrid>

    </div>

    <ContentCardGroupGrid
      v-if="contents.length"
      :contents="contents"
      :genContentLink="genContentLink"
    />

  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import TextTruncator from 'kolibri.coreVue.components.TextTruncator';
  import ProgressIcon from 'kolibri.coreVue.components.ProgressIcon';
  import { PageNames } from '../constants';
  import ContentCardGroupGrid from './ContentCardGroupGrid';
  import CardThumbnail from './ContentCard/CardThumbnail';

  export default {
    name: 'TopicsPage',
    metaInfo() {
      let title;
      if (this.isRoot) {
        title = this.$tr('documentTitleForChannel', {
          channelTitle: this.channelTitle,
        });
      } else {
        title = this.$tr('documentTitleForTopic', {
          channelTitle: this.channelTitle,
          topicTitle: this.topic.title,
        });
      }
      return { title };
    },
    components: {
      CardThumbnail,
      ContentCardGroupGrid,
      ProgressIcon,
      TextTruncator,
    },
    mixins: [responsiveWindowMixin],
    computed: {
      ...mapState('topicsTree', ['channel', 'contents', 'isRoot', 'topic']),
      channelTitle() {
        return this.channel.title;
      },
      topicOrChannel() {
        // Get the channel if we're root, topic if not
        return this.isRoot ? this.channel : this.topic;
      },
      getTagline() {
        return this.topicOrChannel['tagline'] || this.topicOrChannel['description'] || null;
      },
      calculateProgress() {
        // calculate progress across all topics
        const contentsLength = this.contents.length;
        if (contentsLength !== 0) {
          const computedSum =
            this.contents.map(content => content.progress).reduce((acc, val) => acc + val) /
            contentsLength;
          return computedSum !== 0 ? computedSum : undefined;
        }

        return undefined;
      },
    },
    methods: {
      genContentLink(id, kind) {
        const routeName =
          kind === ContentNodeKinds.TOPIC ? PageNames.TOPICS_TOPIC : PageNames.TOPICS_CONTENT;
        return {
          name: routeName,
          params: { id },
        };
      },
    },
    $trs: {
      documentTitleForChannel: 'Topics - { channelTitle }',
      documentTitleForTopic: '{ topicTitle } - { channelTitle }',
    },
  };

</script>


<style lang="scss" scoped>

  .hero-heading {
    position: absolute;
    top: 112px;
    right: 0;
    left: 0;
    width: 100%;
    padding: 24px;
    background: white;
  }

  .title {
    h3 {
      margin-top: 0;
      margin-bottom: 16px;
      font-size: 2rem;
    }
  }

  .text {
    padding-left: 16px;
    margin-bottom: 16px;
    line-height: 1.5em;
  }

  /deep/.card-thumbnail-wrapper {
    max-width: 100%;
  }

</style>
