<template>

  <CoreFullscreen
    ref="slideshowRenderer"
    class="slideshow-renderer"
    :style="{ height: contentHeight }"
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
    <Hooper v-if="slides" @slide="handleSlide" @loaded="setHooperListWidth">
      <Slide v-for="slide in slides" :key="slide.id">
        <div
          class="slideshow-slide-image"
          :style="{
            height: `calc(100% - ${captionHeight}px)`
          }"
        >
          <img
            :src="slide.storage_url"
            :aria-labelledby="slideTextId(slide.id)"
          >
        </div>
        <div :id="slideTextId(slide.id)" class="hidden-descriptive-text">
          {{ slide.descriptive_text || slide.caption }}
        </div>
        <div :ref="slide.id" class="caption">
          {{ slide.caption }}
        </div>
      </Slide>
      <HooperNavigation
        slot="hooper-addons"
        :class="{'hooper-navigation-fullscreen' : isInFullscreen}"
      />
      <HooperPagination slot="hooper-addons" />
    </Hooper>
  </CoreFullscreen>

</template>


<script>

  import orderBy from 'lodash/orderBy';

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
  import { checksumFromFile } from '../utils.js';
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
    }),
    computed: {
      slideshowImages: function() {
        const files = this.files;
        return files.filter(file => file.preset != 'Slideshow Manifest');
      },
      captionHeight: function() {
        return 30 + (this.currentSlide ? this.$refs[this.currentSlide.id][0].clientHeight : 0);
      },
      contentHeight: function() {
        return window.innerHeight * 0.7 + 'px';
      },
    },
    mounted() {
      /*
        Using the manifest file, get the JSON from the manifest, then
        use the manifest JSON to get all slide images and metadata.
      */
      fetch(this.defaultFile.storage_url, { method: 'GET' })
        .then(response => {
          return response.status === 200 ? response.json() : {};
        })
        .then(manifest_data => {
          this.manifest = manifest_data.slideshow_data;

          this.slides = orderBy(
            this.manifest.map(image => {
              return {
                storage_url: this.slideshowImages.find(
                  sFile => checksumFromFile(sFile) == image.checksum
                ).storage_url,
                caption: image.caption,
                sort_order: image.sort_order,
                id: image.checksum,
                descriptive_text: image.descriptive_text,
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
      slideTextId(id) {
        return 'descriptive-text-' + id;
      },
      setHooperListWidth() {
        /*
          Hooper generates a wrapper with the .hooper-list class, which originally uses flexbox.
          In order to implement the same functionality without flexbox, we must use some vanilla JS
          to adjust the width of that element.
        */
        try {
          window.document
            .getElementsByClassName('hooper-list')[0]
            .setAttribute('style', `width: calc(100% * ${this.slides.length});`);
        } catch (err) {
          // If we don't explicitly set an error, the renderer will display broken giving worse
          // UX than getting an error message.
          this.$store.commit('CORE_SET_ERROR', err);
        }
      },
    },
    $trs: {
      exitFullscreen: 'Exit fullscreen',
      enterFullscreen: 'Enter fullscreen',
    },
  };

</script>


<style lang="scss" scoped>

  .btn {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 12;
    fill: white;
  }

  .slideshow-renderer {
    position: relative;
    overflow: hidden;
    text-align: center;
  }

  .hidden-descriptive-text {
    position: absolute;
    top: auto;
    left: -10000px;
    width: 1px;
    height: 1px;
    overflow: hidden;
  }

  .slideshow-slide-image {
    position: relative;
    box-sizing: content-box;
    width: calc(100% - 100px);
    height: calc(100% - 50px);
    margin: 0 auto;
    background-repeat: no-repeat;
    background-position: center center;
    background-size: contain;

    img {
      object-fit: contain;
      width: 100%;
      height: 100%;
    }
  }

  .hooper {
    height: 100%;
  }

  .hooper-pagination {
    width: 100%;
    background: #cccccc;
  }

  .caption {
    position: absolute;
    bottom: 30px;
    width: 100%;
    padding: 12px;
    background: #efefef;
  }

</style>
