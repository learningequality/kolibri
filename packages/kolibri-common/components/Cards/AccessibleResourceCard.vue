<template>

  <KCard
    :to="to"
    :headingLevel="headingLevel"
    :layout="windowBreakpoint === 0 ? 'vertical' : 'horizontal'"
    thumbnailDisplay="large"
    :title="contentNode.title"
    :thumbnailSrc="thumbnailSrc"
    thumbnailAlign="right"
    :thumbnailScaleType="thumbnailScaleType"
  >
    <template #thumbnailPlaceholder>
      <div class="default-resource-icon">
        <LearningActivityIcon :kind="contentNode.learning_activities" />
      </div>
    </template>
    <template #belowTitle>
      <div>
        <KTextTruncator
          :text="contentNode.description"
          :maxLines="2"
        />
      </div>
    </template>
    <template #footer>
      <div class="default-icon">
        <KIconButton
          :icon="isBookmarked ? 'bookmark' : 'bookmarkEmpty'"
          size="mini"
          :color="$themePalette.grey.v_600"
          :ariaLabel="coreString('savedFromBookmarks')"
          :tooltip="coreString('savedFromBookmarks')"
          @click.stop="isBookmarked = !isBookmarked"
        />

        <KIconButton
          icon="infoOutline"
          size="mini"
          :color="$themePalette.grey.v_600"
          :ariaLabel="coreString('viewInformation')"
          :tooltip="coreString('viewInformation')"
          @click.stop="$emit('toggleInfo')"
        />
      </div>
    </template>
  </KCard>

</template>


<script>

  import { validateLinkObject } from 'kolibri.utils.validators';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import LearningActivityIcon from './../ResourceDisplayAndSearch/LearningActivityIcon.vue';

  export default {
    name: 'AccessibleResourceCard',
    components: {
      LearningActivityIcon,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { windowBreakpoint } = useKResponsiveWindow();

      return {
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
      thumbnailScaleType: {
        type: String,
        default: 'centerInside',
      },
    },
    data() {
      return {
        isBookmarked: false,
      };
    },
    computed: {},
  };

</script>


<style lang="scss" scoped>

  .default-resource-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    font-size: 48px;
  }

  .default-icon {
    text-align: right;
  }

</style>
