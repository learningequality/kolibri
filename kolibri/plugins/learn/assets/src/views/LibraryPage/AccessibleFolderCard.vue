<template>

  <div>
    <KGrid gutter="16" >
      <KGridItem
        v-for="(contentNode, idx) in resumableContentNodes"
        :key="idx"
        :layout="{ span: layoutSpan }"
      >
        <KCard
          :to="{ name: '/' }"
          layout="horizontal"
          thumbnailDisplay="small"
          :thumbnailSrc="thumbnailUrl(contentNode)"
          :headingLevel="2"
          style="margin-bottom:1em;"
        >
        
          <template #aboveTitle>
            <div>
              <h4>Hello</h4>
            </div>
          </template>
          <template #title>
            <div>
              <KTextTruncator
                :text="contentNode.title"
                :maxLines="1"
              />
            </div>
          </template>
          <template #belowTitle>
            <div
              :style="{
                'background-color': $themePalette.grey.v_100,
                'padding': '2px', 
                'width': '80px' 
              }" 
            >
              <KIcon icon="topic" /> Folder
            </div>
          </template>
        </KCard>
      </KGridItem>
    </KGrid>
    
  </div>

</template>


<script>

  import KCard from 'kolibri-design-system/lib/KCard';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { getContentNodeThumbnail } from 'kolibri.utils.contentNode';
  import useCardLayoutSpan from '../../composables/useCardLayoutSpan';
  import useChannels from '../../composables/useChannels';
  import useLearnerResources from '../../composables/useLearnerResources';
  

  export default {
    name: 'AccessibleFolderCard',
    components: {
      KCard,
    },
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();
      const { layoutSpan } = useCardLayoutSpan();
      const { resumableContentNodes } = useLearnerResources();
      const { getChannelThumbnail } = useChannels();

      return {
        windowIsSmall,
        layoutSpan,
        resumableContentNodes,
        getChannelThumbnail
      };
    },
    methods: {
      thumbnailUrl(contentNode) {
        const thumbnail = getContentNodeThumbnail(contentNode);
        if (!thumbnail) {
          const parent = contentNode.parent;
          if (!parent) {
            return this.getChannelThumbnail(contentNode && contentNode.channel_id);
          }
        }
        return thumbnail;
      },
    }

  };

</script>