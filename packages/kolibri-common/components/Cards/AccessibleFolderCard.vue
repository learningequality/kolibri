<template>

  <KCard
    :to="to"
    :headingLevel="headingLevel"
    :orientation="windowBreakpoint === 0 ? 'vertical' : 'horizontal'"
    thumbnailDisplay="large"
    :title="contentNode.title"
    :thumbnailSrc="thumbnailSrc"
    thumbnailScaleType="contain"
    thumbnailAlign="right"
    :preserveFooter="true"
  >
    <template #thumbnailPlaceholder>
      <div class="default-folder-icon">
        <KIcon
          icon="topic"
          :color="$themePalette.grey.v_700"
          style="top: 0"
        />
      </div>
    </template>

    <template #belowTitle>
      <div>
        <slot name="belowTitle"></slot>
        <br v-if="contentNode.description" >
        <KTextTruncator
          v-if="contentNode.description"
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

    <template #select>
      <slot name="select"></slot>
    </template>
  </KCard>

</template>


<script>

  import { toRefs } from 'vue';
  import { validateLinkObject } from 'kolibri/utils/validators';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { useCoachMetadataTags } from 'kolibri-common/composables/useCoachMetadataTags';
  import MetadataChips from 'kolibri-common/components/MetadataChips';

  export default {
    name: 'AccessibleFolderCard',
    components: {
      MetadataChips,
    },
    mixins: [commonCoreStrings],
    setup(props) {
      const { contentNode } = toRefs(props);
      const { windowBreakpoint } = useKResponsiveWindow();
      const { getFolderTags } = useCoachMetadataTags(contentNode.value);

      return {
        metadataTags: getFolderTags(),
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

  .chips-wrapper {
    display: flex;
    justify-content: space-between;
    height: 38px;
    font-size: 12px;
  }

  .folder-header-bar {
    display: inline-block;
    margin-left: 8px;
    font-size: 16px;
  }

  .folder-header-text {
    display: inline-block;
    padding: 0;
    margin: 4px;
    font-size: 12px;
  }

  .default-folder-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    max-height: 160px;
    font-size: 48px;
  }

</style>
