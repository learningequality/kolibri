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
          <ResourceSelection
            :channelId="channelId"
            :channelName="channelName"
            :channelThumbnail="channelThumbnail"
            :channelDescription="channelDescription"
          />
        </KGridItem>
      </KGrid>
    </div>
  </div>

</template>


<script>

  import ResourceSelection from './ResourceSelection.vue';

  export default {
    name: 'QuizResourceCard',
    components: {
      ResourceSelection,
    },
  };

</script>


<style>

.card-shadow{
    margin-top:.5em;
}
</style>
