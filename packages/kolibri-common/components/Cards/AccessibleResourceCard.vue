<template>

  <KCard
    :to="to"
    :headingLevel="headingLevel"
    :layout="computedLayout" 
    thumbnailDisplay="large"
    :title="contentNode.title"
    :thumbnailSrc="thumbnailSrc"
    thumbnailAlign="right"
    :thumbnailScaleType="thumbnailScaleType"
    :style="{ height: '250px', margin: '16px 0 16px 0', }"
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
          icon="bookmarkEmpty"
          size="mini"
          :color="$themePalette.grey.v_600"
          :ariaLabel="coreString('savedFromBookmarks')"
          :tooltip="coreString('savedFromBookmarks')"
          @click.stop="$emit('toggleBookmark')"
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
    computed: {
      computedLayout() {
        if (this.windowBreakpoint === 0) {
          return 'vertical';
        }
        // Check windowBreakpoint and conditionally set layout
        return this.windowBreakpoint === 0 ? 'vertical' : 'horizontal';
      },
    },
  };

</script>


<style lang="scss" scoped>

  .default-resource-icon {
    width: 172px;
    height: 172px;
    margin: auto;
    margin-top: 40px;
    font-size: 48px;
    text-align: center;
  }

  .default-icon {
    margin-top: 20px;
    position: absolute;
    display: flex;
    align-content: end;
    padding: 16px;
    margin-bottom: 8px;
  }

</style>
