<template>

  <CoreFullscreen
    ref="slideshowRenderer"
    class="slideshow-renderer"
    @changeFullscreen="isInFullscreen = $event"
  >
    <UiIconButton
      class="btn"
      :ariaLabel="isInFullscreen ? $tr('exitFullscreen') : $tr('enterFullscreen')"
      color="primary"
      size="small"
      @click="$refs.slideshowRenderer.toggleFullscreen()"
    >
      <mat-svg v-if="isInFullscreen" name="fullscreen_exit" category="navigation" />
      <mat-svg v-else name="fullscreen" category="navigation" />
    </UiIconButton>
    <Hooper v-if="slides" @slide="handleSlide">
      <Slide v-for="slide in slides" :key="slide.id">
        <div
          class="slideshow-slide-image"
          :style="{ backgroundImage: `url(${slide.storage_url})` }"
        >
        </div>
      </Slide>
      <HooperNavigation
        slot="hooper-addons"
        :class="{'hooper-navigation-fullscreen' : isInFullscreen}"
      />
      <HooperPagination slot="hooper-addons" />
      <div slot="hooper-addons" class="caption">
        {{ (currentSlide && currentSlide.caption) || slides[0].caption }}
      </div>
    </Hooper>
  </CoreFullscreen>

</template>


<script>

  import _ from 'lodash';

  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import contentRendererMixin from 'kolibri.coreVue.mixins.contentRendererMixin';
  import responsiveElement from 'kolibri.coreVue.mixins.responsiveElement';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';

  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  import CoreFullscreen from 'kolibri.coreVue.components.CoreFullscreen';
  import {
    Hooper,
    Slide,
    Navigation as HooperNavigation,
    Pagination as HooperPagination,
  } from 'hooper';
  import '../../styles/custom-hooper.css';

  export default {
    name: 'SlideshowRendererComponent',
    components: {
      UiIconButton,
      CoreFullscreen,
      Hooper,
      Slide,
      HooperPagination,
      HooperNavigation,
    },
    mixins: [contentRendererMixin, themeMixin, responsiveElement, responsiveWindow],
    props: {
      defaultFile: {
        type: Object,
        default: () => {},
      },
      files: {
        type: Array,
        default: () => [],
      },
    },
    data: () => ({
      isInFullscreen: false,
      manifest: {},
      slides: null,
      currentSlide: null,
      hooperSettings: {
        centerMode: true,
      },
    }),
    $trs: {
      exitFullscreen: 'Exit fullscreen',
      enterFullscreen: 'Enter fullscreen',
    },
    computed: {
      slideshow_images: function() {
        const files = this.files;
        return files.filter(file => file.preset != 'Slideshow Manifest');
      },
    },
    mounted() {
      fetch(this.defaultFile.storage_url, { method: 'GET' })
        .then(response => {
          return response.status === 200 ? response.json() : {};
        })
        .then(manifest_data => {
          this.manifest = manifest_data.slideshow_data;

          this.slides = _.orderBy(
            this.manifest.map(image => {
              return {
                storage_url: this.slideshow_images.find(
                  sFile =>
                    sFile.storage_url
                      .split('/')
                      [sFile.storage_url.split('/').length - 1].split('.')[0] == image.checksum
                ).storage_url,
                caption: image.caption,
                sort_order: image.sort_order,
                id: image.checksum,
              };
            }),
            ['sort_order'],
            ['asc']
          );
        });
    },
    methods: {
      handleSlide(payload) {
        this.currentSlide = this.slides[payload.currentSlide];
      },
    },
  };

</script>


<style lang="scss" scoped>

  .btn {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 100;
    fill: white;
  }
  .slideshow-renderer {
    position: relative;
    height: 500px;
    overflow-x: auto;
    overflow-y: hidden;
    text-align: center;
  }
  .slideshow-slide-image {
    position: relative;
    box-sizing: content-box;
    width: calc(100% - 100px);
    height: calc(
      100% - 40px
    ); // Very much not going to be this way once the caption positioning is figured out

    margin: 0 auto;
    background-repeat: no-repeat;
    background-position: center center;
    background-size: contain;
  }
  .hooper {
    height: 100%;
  }
  .hooper-pagination {
    width: 100%;
    background: #efefef;
  }
  .caption {
    position: absolute;
    bottom: 20px;
    width: 100%;
    background: #efefef;
  }

</style>
