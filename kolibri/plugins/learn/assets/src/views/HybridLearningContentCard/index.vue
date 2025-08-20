<template>

  <div class="card drop-shadow">
    <router-link
      :to="to"
      class="card card-link"
      :class="[$computedClass({ ':focus': $coreOutline })]"
      :style="{ backgroundColor: $themeTokens.surface }"
    >
      <div
        class="header-bar"
        :style="headerStyles"
      >
        <div v-if="!contentNode.is_leaf">
          <KIcon
            icon="topic"
            :color="$themeTokens.textInverted"
            class="folder-header-bar"
          />
          <p class="folder-header-text">
            {{ coreString('folder') }}
          </p>
        </div>
        <LearningActivityLabel
          v-if="contentNode.is_leaf"
          :labelAfter="true"
          :contentNode="contentNode"
          :hideDuration="true"
          class="learning-activity-label"
          :style="{ color: $themeTokens.text }"
        />
        <img
          v-if="contentNode.is_leaf && channelThumbnail.length > 0"
          :src="channelThumbnail"
          :alt="learnString('logo', { channelTitle: channelTitle })"
          class="channel-logo"
          loading="lazy"
        >
      </div>
      <CardThumbnail
        class="thumbnail"
        :contentNode="contentNode"
      />
      <div
        class="text"
        :style="{ color: $themeTokens.text }"
      >
        <h3
          class="title"
          dir="auto"
        >
          <KTextTruncator
            :text="contentNode.title"
            :maxLines="1"
          />
        </h3>
        <KButton
          v-if="contentNode.copies && contentNode.copies.length"
          appearance="basic-link"
          class="copies"
          :text="coreString('copies', { num: contentNode.copies.length })"
          @click.prevent="$emit('openCopiesModal', contentNode.copies)"
        />
      </div>
    </router-link>
    <slot name="footer"></slot>
  </div>

</template>


<script>

  import { validateLinkObject } from 'kolibri/utils/validators';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useChannels from 'kolibri-common/composables/useChannels';
  import LearningActivityLabel from '../LearningActivityLabel';
  import commonLearnStrings from '../commonLearnStrings';
  import CardThumbnail from './CardThumbnail.vue';

  export default {
    name: 'HybridLearningContentCard',
    components: {
      CardThumbnail,
      LearningActivityLabel,
    },
    mixins: [commonLearnStrings, commonCoreStrings],
    setup() {
      const { getChannelThumbnail, getChannelTitle } = useChannels();
      return {
        getChannelThumbnail,
        getChannelTitle,
      };
    },
    props: {
      to: {
        type: Object,
        required: true,
        validator: validateLinkObject,
      },
      contentNode: {
        type: Object,
        required: true,
      },
    },
    computed: {
      headerStyles() {
        let styles = {};
        if (!this.contentNode.is_leaf) {
          styles = {
            backgroundColor: this.$themeTokens.text,
            borderRadius: '8px 8px 0 0',
            color: this.$themeTokens.textInverted,
          };
        }
        return styles;
      },
      channelThumbnail() {
        return this.getChannelThumbnail(this.contentNode && this.contentNode.channel_id);
      },
      channelTitle() {
        return this.getChannelTitle(this.contentNode && this.contentNode.channel_id);
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';
  @import './card';

  .drop-shadow {
    @extend %dropshadow-1dp;

    &:hover {
      @extend %dropshadow-6dp;
    }
  }

  .card {
    position: relative;
    display: inline-block;
    vertical-align: top;
    border-radius: 8px;
    transition: box-shadow $core-time ease;

    &:focus {
      outline-width: 4px;
      outline-offset: 6px;
    }
  }

  .card-link {
    width: 100%;
    text-decoration: none;
  }

  .copies {
    display: inline-block;
    font-size: 13px;
    text-decoration: none;
    vertical-align: top;
  }

  .header-bar {
    display: flex;
    justify-content: space-between;
    height: 48px;
    padding: 8px 16px;
    font-size: 13px;

    .channel-logo {
      align-self: end;
      height: 28px;
      margin-bottom: 4px;
    }
  }

  .folder-header-bar {
    display: inline-block;
    margin-right: 8px;
    font-size: 16px;
  }

  .folder-header-text {
    display: inline-block;
    padding: 0;
    margin: 0;
    font-size: 13px;
  }

  .k-labeled-icon {
    display: inline-block;
    max-width: calc(100% - 50px);
    height: 24px;
    margin-bottom: 0;
    vertical-align: top;
  }

  .text {
    position: relative;
    height: 120px;
    padding: 0 $margin $margin $margin;
  }

  .learning-activity-label {
    width: 60%;
  }

</style>
