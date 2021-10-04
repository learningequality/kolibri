<template>

  <span class="channel-thumbnail">
    <!--
      we consider thumbnails decorative - empty `alt`
      attribute to hide it from screen readers
    -->
    <img
      v-if="thumbnailUrl"
      class="image"
      :src="thumbnailUrl"
      alt=""
    >
  </span>

</template>


<script>

  export default {
    name: 'ChannelThumbnail',
    props: {
      thumbnailUrl: {
        type: String,
        required: false,
        default: '',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .channel-thumbnail {
    display: flex;
    flex-direction: column;
    justify-content: center;
    width: 100%;
  }

  .image {
    width: 100%;
    height: auto;
  }

</style>
