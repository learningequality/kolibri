<template>

  <div class="">
    <div class="card-shadow" style="box-shadow:0px 0px 2px 0px;border-radius:5px;">
      <KGrid>
        <KGridItem
          :layout12="{ span: 4 }"
        >
          <div
            style="
                background-color:#DEDEDE;
                width:100%;
                height:150px;
                margin:10px;
                justify-content: center;"
          >

          </div>
        </KGridItem>

        <KGridItem
          :layout12="{ span: 8 }"
        >
          <p
            style="font-weight:700"
          >
            <KIcon icon="channel" />
            Channel name
          </p>
          <!-- <ChannelCard
            :isMobile="windowIsSmall"
            :title="content.title || content.name"
            :thumbnail="content.thumbnail"
            :tagline="content.tagline || content.description"
            :numCoachContents="content.num_coach_contents"
            :link="genContentLinkBackLinkCurrentPage(content.id, false, deviceId)"
          /> -->
        </KGridItem>
      </KGrid>
    </div>
  </div>

</template>


<script>

  //  import ChannelCard from '/kolibri/plugins/learn/assets/src/views/ChannelCard.vue';

  export default {
    name: 'QuizResourceCard',
    components: {
      // ChannelCard
    },
  };

</script>


<style>

.card-shadow{
    margin-top:.5em;
}
</style>
