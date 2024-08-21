<template>

  <div>
    <KCard
      :to="to"
      layout="horizontal"
      thumbnailDisplay="small"
      thumbnailAlign="right"
      :title="title"
      :headingLevel="headingLevel"
    >
      <template #thumbnailPlaceholder>
        <div>
          <ChannelThumbnail
            :thumbnail="contentNode.thumbnail"
            style="width:100px"
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
  </div>

</template>


<script>

  import ChannelThumbnail from './../ChannelThumbnail.vue';

  export default {
    name: 'AccessibleChannelCard',
    components:{
      ChannelThumbnail,
    },
    props:{
      to: {
        type: Object,
        required: true,
      },
      title:{
        type: String,
        required: true,
      },
      headingLevel:{
        type: Number,
        required: false,
        default: 2,
      },
      contentNode: {
        type: Object,
        required: true,
      },
    },
    computed:{
      numberOfResources(){
        return `${this.contentNode.num_coach_contents} ${this.$tr('resources')}`;
      }
    },
    $trs: {
      resources: {
        message: 'Resources',
        context: 'Number of resources in a channel',
      },
    }
  }

</script>