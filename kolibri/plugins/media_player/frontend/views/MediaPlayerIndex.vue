<template>

  <div>
    <VideoPlayer
      v-if="isVideo"
      v-on="$listeners"
    />
    <AudioPlayer
      v-else
      v-on="$listeners"
    />
  </div>

</template>


<script>

  import { computed } from 'vue';
  import useContentViewer from 'kolibri/composables/useContentViewer';
  import customExtractors, { VIDEO_PRESETS } from '../utils/fileExtractors';
  import VideoPlayer from './VideoPlayer';
  import AudioPlayer from './AudioPlayer';

  export default {
    name: 'MediaPlayerIndex',
    components: { VideoPlayer, AudioPlayer },
    setup(props, context) {
      const { files } = useContentViewer(context, { customExtractors });

      const isVideo = computed(() => {
        return files.value.some(file => VIDEO_PRESETS.has(file.preset));
      });

      return { isVideo };
    },
  };

</script>
