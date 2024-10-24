<template>

  <KCard
    :to="to"
    :orientation="windowBreakpoint === 0 ? 'vertical' : 'horizontal'"
    thumbnailDisplay="small"
    thumbnailAlign="right"
    :thumbnailSrc="thumbnailSrc"
    :title="title"
    :headingLevel="headingLevel"
  >
    <template #thumbnailPlaceholder>
      <div>
        <ContentIcon
          kind="channel"
          class="type-icon"
          :color="$themeTokens.annotation"
        />
      </div>
    </template>
    <template #belowTitle>
      <div>
        <KTextTruncator
          :text="coachString('numberOfResources', { value: contentNode.num_coach_contents })"
          :maxLines="1"
        />
        <KTextTruncator
          :text="contentNode.description"
          :maxLines="2"
        />
      </div>
    </template>
  </KCard>

</template>


<script>

  import ContentIcon from 'kolibri-common/components/labels/ContentIcon';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import commonCoach from './../../../../kolibri/plugins/coach/assets/src/views/common';

  export default {
    name: 'AccessibleChannelCard',
    components: {
      ContentIcon,
    },
    mixins: [commonCoach],
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
      },
      title: {
        type: String,
        required: true,
      },
      headingLevel: {
        type: Number,
        required: false,
        default: 2,
      },
      contentNode: {
        type: Object,
        required: true,
      },
      thumbnailSrc: {
        type: String,
        default: null,
      },
    },
  };

</script>


<style scoped>

  .type-icon {
    right: 10px;
    font-size: 3em;
  }

</style>
