<template>

  <KCard
    :to="to"
    layout="horizontal"
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
          :text="numberOfResources"
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

  import ContentIcon from 'kolibri.coreVue.components.ContentIcon';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'AccessibleChannelCard',
    components: {
      ContentIcon,
    },
    mixins: [commonCoreStrings],
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
    computed: {
      numberOfResources() {
        return `${this.contentNode.num_coach_contents} ${this.coreString('resourcesLabel')}`;
      },
    },
  };

</script>
