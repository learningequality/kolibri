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
          :to="{}"
          :contentNode="device"
          :title="device.title"
          :headingLevel="2"
          :style="{ marginBottom: '24px' }"
        />
      </KGridItem>
    </KGrid>
  </div>

</template>


<script>

  import useCardLayoutSpan from '../../composables/useCardLayoutSpan';
  import AccessibleChannelCard from './AccessibleChannelCard';

  export default {
    name: 'HandleAccessibleChannelCard',
    components: {
      AccessibleChannelCard,
    },
    setup() {
      const { layoutSpan } = useCardLayoutSpan();
      return {
        layoutSpan,
      };
    },
    props:{
      contentNode: {
        type: Array,
        required: true,
      },
    }
  }

</script>