<template>

  <div>
    <VideoPlayer
      v-if="isVideo"
      @startTracking="$emit('startTracking')"
      @stopTracking="$emit('stopTracking')"
      @finished="$emit('finished')"
      @updateProgress="$emit('updateProgress', $event)"
      @addProgress="$emit('addProgress', $event)"
      @updateContentState="$emit('updateContentState', $event)"
    />
    <AudioPlayer
      v-else
      @startTracking="$emit('startTracking')"
      @stopTracking="$emit('stopTracking')"
      @finished="$emit('finished')"
      @updateProgress="$emit('updateProgress', $event)"
      @addProgress="$emit('addProgress', $event)"
      @updateContentState="$emit('updateContentState', $event)"
    />
  </div>

</template>


<script>

  import { computed } from 'vue';
  import useContentViewer from 'kolibri/composables/useContentViewer';
  import customExtractors from '../utils/fileExtractors';
  import VideoPlayer from './VideoPlayer';
  import AudioPlayer from './AudioPlayer';

  const videoPresets = new Set(['high_res_video', 'low_res_video']);

  export default {
    name: 'MediaPlayerIndex',
    components: { VideoPlayer, AudioPlayer },
    setup(props, context) {
      const { files } = useContentViewer(context, { customExtractors });

      const isVideo = computed(() => {
        return files.value.some(file => videoPresets.has(file.preset));
      });

      return { isVideo };
    },
  };

</script>
