<template>

  <KCard
    :to="to"
    :headingLevel="headingLevel"
    :orientation="windowBreakpoint === 0 ? 'vertical' : 'horizontal'"
    thumbnailDisplay="large"
    :title="contentNode.title"
    :thumbnailSrc="thumbnailSrc"
    thumbnailAlign="right"
    thumbnailScaleType="contain"
  >
    <template #thumbnailPlaceholder>
      <div class="default-resource-icon">
        <LearningActivityIcon :kind="contentNode.learning_activities" />
      </div>
    </template>
    <template #belowTitle>
      <div>
        <slot name="belowTitle"></slot>
        <br v-if="contentNode.description" >
        <KTextTruncator
          v-if="contentNode.description"
          class="truncator"
          :text="contentNode.description"
          :maxLines="2"
          style="min-height: 17px; margin-bottom: 8px"
        />
        <MetadataChips :tags="metadataTags" />
        <div
          v-if="!contentNode.description"
          style="min-height: 17px"
        ></div>
      </div>
    </template>
    <template #footer>
      <div class="default-icon">
        <KIconButton
          :icon="isBookmarked ? 'bookmark' : 'bookmarkEmpty'"
          size="mini"
          :color="$themePalette.grey.v_700"
          :ariaLabel="
            isBookmarked ? coreString('removeFromBookmarks') : coreString('saveToBookmarks')
          "
          :tooltip="
            isBookmarked ? coreString('removeFromBookmarks') : coreString('saveToBookmarks')
          "
          @click.stop="$emit('toggleBookmark', contentNode.id)"
        />
      </div>
    </template>
    <template #select>
      <slot name="select"></slot>
    </template>
  </KCard>

</template>


<script>

  import { toRefs } from 'vue';
  import { validateLinkObject } from 'kolibri/utils/validators';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import MetadataChips from 'kolibri-common/components/MetadataChips';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { useCoachMetadataTags } from 'kolibri-common/composables/useCoachMetadataTags';
  import LearningActivityIcon from './../ResourceDisplayAndSearch/LearningActivityIcon.vue';

  export default {
    name: 'AccessibleResourceCard',
    components: {
      LearningActivityIcon,
      MetadataChips,
    },
    mixins: [commonCoreStrings],
    setup(props) {
      const { contentNode } = toRefs(props);
      const { getResourceTags } = useCoachMetadataTags(contentNode.value);
      const { windowBreakpoint } = useKResponsiveWindow();
      return {
        metadataTags: getResourceTags(),
        windowBreakpoint,
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
      isBookmarked: {
        type: Boolean,
        default: false,
      },
      headingLevel: {
        type: Number,
        required: true,
      },
      thumbnailSrc: {
        type: String,
        default: null,
      },
    },
  };

</script>


<style lang="scss" scoped>

  /deep/ .k-with-selection-controls {
    justify-content: flex-end !important;
    max-width: 580px;
  }

  .default-resource-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    max-height: 160px;
    font-size: 48px;
  }

  .default-icon {
    text-align: right;

    .button {
      width: 32px !important;
      height: 32px !important;
      line-height: 0px;
    }
  }

  /* Override KTextTruncator's use of break-word to avoid
     the description text breaking weirdly on long words
     which results in the card being too wide */
  /deep/ .truncator {
    span {
      overflow-wrap: anywhere !important;
    }
  }

</style>
