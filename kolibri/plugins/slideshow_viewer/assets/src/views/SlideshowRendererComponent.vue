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
      <KIcon
        v-if="isInFullscreen"
        icon="fullscreen_exit"
        :color="$themeTokens.textInverted"
        style="top: 0; width: 24px; height: 24px"
      />
      <KIcon
        v-else
        icon="fullscreen"
        :color="$themeTokens.textInverted"
        style="top: 0; width: 24px; height: 24px"
      />
    </UiIconButton>
    <Hooper
      v-if="slides.length"
      ref="slider"
      @slide="handleSlide"
      @loaded="initializeHooper"
    >
      <Slide
        v-for="(slide, index) in slides"
        :key="slide.id + index"
        :index="index"
      >
        <div
          class="slideshow-slide-image-wrapper"
          :style="{
            height: `calc(100% - ${captionHeight}px)`,
          }"
        >
          <img
            :src="slide.storage_url"
            :aria-labelledby="slideTextId(slide.id)"
            class="slideshow-slide-image"
          >
        </div>
        <div
          :id="slideTextId(slide.id)"
          class="visuallyhidden"
        >
          {{ slide.descriptive_text || slide.caption }}
        </div>
        <div
          :ref="slide.id"
          :style="{ background: $themePalette.grey.v_300 }"
          class="caption"
        >
          {{ slide.caption }}
        </div>
      </Slide>
      <!-- VUE3-COMPAT: Cannot have multiple components with same target slot -->
      <!-- eslint-disable vue/no-deprecated-slot-attribute -->
      <HooperNavigation
        slot="hooper-addons"
        :class="{ 'hooper-navigation-fullscreen': isInFullscreen }"
      />
      <HooperPagination
        slot="hooper-addons"
        :style="{ background: $themePalette.grey.v_400, width: '100%' }"
      />
      <!-- eslint-enable -->
    </Hooper>
  </CoreFullscreen>

</template>


<script>

  import has from 'lodash/has';
  import orderBy from 'lodash/orderBy';
  import objectFitImages from 'object-fit-images';
  import client from 'kolibri/client';

  import UiIconButton from 'kolibri-design-system/lib/keen/UiIconButton';
  import CoreFullscreen from 'kolibri-common/components/CoreFullscreen';
  import {
    Hooper,
    Slide,
    Navigation as HooperNavigation,
    Pagination as HooperPagination,
  } from 'hooper';

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
    data: () => ({
      isInFullscreen: false,
      slides: [],
      currentSlideIndex: 0,
      highestViewedSlideIndex: 0,
      visitedSlides: {},
    }),
    computed: {
      currentSlide() {
        return this.slides[this.currentSlideIndex];
      },
      savedVisitedSlides: {
        get() {
          if (this.extraFields && this.extraFields.contentState) {
            return this.extraFields.contentState.savedVisitedSlides || {};
          }
          return {};
        },
        set(value) {
          this.visitedSlides = value;
        },
      },
      slideshowImages: function () {
        const files = this.files;
        return files.filter(file => file.preset != 'slideshow_manifest');
      },
      captionHeight: function () {
        return (
          30 +
          (this.currentSlide && this.$refs[this.currentSlide.id]
            ? this.$refs[this.currentSlide.id][0].clientHeight
            : 0)
        );
      },
      contentHeight: function () {
        return window.innerHeight * 0.7 + 'px';
      },
      /**
       * @public
       * Note: the default duration historically for slidshows has been 5 min
       */
      defaultDuration() {
        return 300;
      },
    },
    watch: {
      defaultFile(newFile) {
        if (newFile) {
          this.setSlidesFromDefaultFile(newFile);
        }
      },
      itemData(newData) {
        if (newData) {
          this.setSlides(newData);
        }
      },
      currentSlideIndex() {
        if (this.currentSlideIndex + 1 <= this.slides.length) {
          this.updateProgress();
        }
      },
    },
    created() {
      if (this.defaultFile) {
        this.setSlidesFromDefaultFile(this.defaultFile);
      } else if (this.itemData) {
        this.setSlides(this.itemData);
      }
    },
    mounted() {
      this.$emit('startTracking');
      if (this.extraFields && has(this.extraFields, 'contentState')) {
        this.highestViewedSlideIndex = this.extraFields.contentState.highestViewedSlideIndex;
      } else {
        this.extraFields.contentState = {
          highestViewedSlideIndex: 0,
          lastViewedSlideIndex: 0,
        };
      }
    },
    beforeDestroy() {
      this.updateProgress();
      this.updateContentState();
      this.$emit('stopTracking');
    },
    methods: {
      setSlidesFromDefaultFile(defaultFile) {
        /*
         * First check that the file has a storage url and that it is a JSON file.
         */
        if (has(defaultFile, 'storage_url') && defaultFile.extension === 'json') {
          /*
          Using the manifest file, get the JSON from the manifest, then
          use the manifest JSON to get all slide images and metadata.
        */
          const url = defaultFile.storage_url;
          const method = 'get';
          client({ url, method }).then(({ data }) => {
            this.setSlides(data);
          });
        }
      },
      setSlides(slideShowData) {
        this.slides = orderBy(
          slideShowData.slideshow_data.map(image => {
            const fileData = this.slideshowImages.find(sFile => sFile.checksum == image.checksum);
            return {
              storage_url: fileData ? fileData.storage_url : image.url,
              caption: image.caption,
              sort_order: image.sort_order,
              id: image.checksum,
              descriptive_text: image.descriptive_text,
            };
          }),
          ['sort_order'],
          ['asc'],
        );
        this.currentSlideIndex = this.highestViewedSlideIndex;
      },
      handleSlide(payload) {
        this.currentSlideIndex = payload.currentSlide;
        if (this.currentSlideIndex > this.highestViewedSlideIndex) {
          this.highestViewedSlideIndex = this.currentSlideIndex;
        }
        this.storeVisitedSlide(this.currentSlideIndex);
        this.updateProgress();
        this.updateContentState();
        if (this.currentSlideIndex >= this.slides.length - 1) {
          this.$emit('finished');
        }
      },
      slideTextId(id) {
        return 'descriptive-text-' + id;
      },
      storeVisitedSlide(currentSlideNum) {
        const visited = this.savedVisitedSlides;
        visited[currentSlideNum] = true;
        this.savedVisitedSlides = visited;
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
      polyfillSlideObjectFit() {
        /* Instantiate polyfill for object-fit: contain */
        const slideImages = global.window.document.getElementsByClassName('slideshow-slide-image');
        objectFitImages(slideImages);
      },
      initializeHooper() {
        /*
        Hooper emits a "loaded" event. We initialize the object-fit polyfill and set the width of
        the wrapping container for the slides
      */
        this.polyfillSlideObjectFit();
        this.setHooperListWidth();
        // Do this on nextTick to avoid sliding into position without proper resizing occurring.
        this.$nextTick(() =>
          this.$refs.slider.slideTo(this.extraFields.contentState.lastViewedSlideIndex),
        );
      },
      updateContentState() {
        let contentState;
        if (this.extraFields) {
          contentState = {
            ...this.extraFields.contentState,
            highestViewedSlideIndex: this.highestViewedSlideIndex,
            lastViewedSlideIndex: this.currentSlideIndex,
            savedVisitedSlides: this.visitedSlides || this.savedVisitedSlides,
          };
        } else {
          contentState = {
            highestViewedSlideIndex: this.highestViewedSlideIndex,
            lastViewedSlideIndex: this.currentSlideIndex,
            savedVisitedSlides: this.visitedSlides || this.savedVisitedSlides,
          };
        }
        this.$emit('updateContentState', contentState);
      },
      updateProgress() {
        if (this.forceDurationBasedProgress) {
          // update progress using total time user has spent on the slideshow
          this.$emit('updateProgress', this.durationBasedProgress);
        } else {
          // update progress using number of slides seen out of available slides
          this.$emit(
            'updateProgress',
            Object.keys(this.savedVisitedSlides).length / this.slides.length,
          );
        }
      },
    },
    $trs: {
      exitFullscreen: {
        message: 'Exit fullscreen',
        context:
          "Learners can use the Esc key or the 'EXIT FULLSCREEN' button to close the fullscreen view on a slideshow.",
      },
      enterFullscreen: {
        message: 'Enter fullscreen',
        context:
          "Learners can use the 'ENTER FULLSCREEN' button in the upper right corner to open a slideshow in fullscreen view.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import './custom-hooper.css';

  .btn {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 12;
  }

  .slideshow-renderer {
    position: relative;
    overflow: hidden;
    text-align: center;
  }

  .slideshow-slide-image-wrapper {
    position: relative;
    box-sizing: content-box;
    width: calc(100% - 100px);
    height: calc(100% - 50px);
    margin: 0 auto;
  }

  .slideshow-slide-image {
    width: 100%;
    height: 100%;
    // Adds support for object-fit-images polyfill.
    font-family: 'object-fit: contain;';
    object-fit: contain;
  }

  .hooper {
    height: 100%;
  }

  .caption {
    position: absolute;
    bottom: 30px;
    width: 100%;
    padding: 12px;
  }

</style>
