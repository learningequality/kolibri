<template>

  <div>
    <h2>Accessible Channel Card</h2>
    <KGrid>
      <KGridItem
        v-for="device in contentNode"
        :key="device.id"
        :layout="{ span: layoutSpan }"
      >
        <AccessibleChannelCard
          :to="genContentLinkBackLinkCurrentPage(device.id, false, null)"
          :contentNode="device"
          :title="device.title"
          :headingLevel="2"
          :thumbnailSrc="device.thumbnail"
          :style="{ marginBottom: '24px' }"
        />
      </KGridItem>
    </KGrid>
  </div>

</template>


<script>

  import useCardLayoutSpan from '../../composables/useCardLayoutSpan';
  import useContentLink from '../../composables/useContentLink';
  import AccessibleChannelCard from '../../../../../../../packages/kolibri-common/components/Cards/AccessibleChannelCard';

  export default {
    name: 'HandleAccessibleChannelCard',
    components: {
      AccessibleChannelCard,
    },
    setup() {
      const { layoutSpan } = useCardLayoutSpan();
      const { genContentLinkBackLinkCurrentPage } = useContentLink();
      return {
        layoutSpan,
        genContentLinkBackLinkCurrentPage,
      };
    },
    props: {
      contentNode: {
        type: Array,
        required: true,
      },
    },
  };

</script>
