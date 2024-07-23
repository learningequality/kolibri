<template>

  <div>
    <ul>
      <KCard
        class="card"
        :to="to"
        :headingLevel="2"
        layout="horizontal"
        thumbnailDisplay="large"
        :title="contentNode.title"
      >
        <template #thumbnailPlaceholder>
          <div>
            <CardThumbnail
              class="thumbnail"
              :contentNode="contentNode"
            />
          </div>
        </template>

        <template #aboveTitle>
          <div>
            <div
              class="header-bar"
              :style="headerStyles"
            >
              <div v-if="!contentNode.is_leaf">
                <KIcon
                  icon="topic"
                  :color="$themeTokens.text"
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
              >
            </div>
          </div>
        </template>

        <template #belowTitle>
          <div class="">
            <KButton
              v-if="contentNode.copies && contentNode.copies.length"
              appearance="basic-link"
              class="copies"
              :text="coreString('copies', { num: contentNode.copies.length })"
              @click.prevent="$emit('openCopiesModal', contentNode.copies)"
            />
          </div>
        </template>

        <template #footer>
          <div>
            <slot name="footer"></slot>
          </div>
        </template>
      </KCard>
    </ul>
  </div>

</template>


<script>

  import { validateLinkObject } from 'kolibri.utils.validators';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import useChannels from '../../composables/useChannels';
  import LearningActivityLabel from '../LearningActivityLabel';
  import commonLearnStrings from '../commonLearnStrings';
  import CardThumbnail from './../HybridLearningContentCard/CardThumbnail.vue';

  export default {
    name: 'AccessibleFolderCard',
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
            borderRadius: '8px 8px 0 0',
            color: this.$themeTokens.text,
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

  .drop-shadow {
    @extend %dropshadow-1dp;

    &:hover {
      @extend %dropshadow-8dp;
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
    height: 38px;
    padding: 6px 8px;
    font-size: 12px;

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

  .learning-activity-label {
    width: 60%;
  }

</style>
