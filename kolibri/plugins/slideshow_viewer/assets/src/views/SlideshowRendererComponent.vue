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
    <Hooper
      v-if="slides.length"
      ref="slider"
      @slide="handleSlide"
      @loaded="initializeHooper"
    >
      <Slide v-for="(slide, index) in slides" :key="slide.id + index" :index="index">
        <div
          class="slideshow-slide-image-wrapper"
          :style="{
            height: `calc(100% - ${captionHeight}px)`
          }"
        >
          <img
            :src="slide.storage_url"
            :aria-labelledby="slideTextId(slide.id)"
            class="slideshow-slide-image"
          >
        </div>
        <div :id="slideTextId(slide.id)" class="visuallyhidden">
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
  import objectFitImages from 'object-fit-images';
  import client from 'kolibri.client';

  import responsiveElementMixin from 'kolibri.coreVue.mixins.responsiveElementMixin';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';

  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  import CoreFullscreen from 'kolibri.coreVue.components.CoreFullscreen';
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
    mixins: [responsiveElementMixin, responsiveWindowMixin],
    data: () => ({
      isInFullscreen: false,
      slides: [],
      currentSlideIndex: 0,
      highestViewedSlideIndex: 0,
    }),
    computed: {
      currentSlide() {
        return this.slides[this.currentSlideIndex];
      },
      slideshowImages: function() {
        const files = this.files;
        return files.filter(file => file.preset != 'slideshow_manifest');
      },
      captionHeight: function() {
        return (
          30 +
          (this.currentSlide && this.$refs[this.currentSlide.id]
            ? this.$refs[this.currentSlide.id][0].clientHeight
            : 0)
        );
      },
      contentHeight: function() {
        return window.innerHeight * 0.7 + 'px';
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
        if (this.currentSlideIndex + 1 === this.slides.length) {
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
      if (this.extraFields && this.extraFields.hasOwnProperty('contentState')) {
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
        if (defaultFile.hasOwnProperty('storage_url') && defaultFile.extension === 'json') {
          /*
            Using the manifest file, get the JSON from the manifest, then
            use the manifest JSON to get all slide images and metadata.
          */
          const path = defaultFile.storage_url;
          const method = 'GET';
          client({ path, method }).then(({ entity }) => {
            this.setSlides(entity);
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
          ['asc']
        );
        this.currentSlideIndex = this.highestViewedSlideIndex;
      },
      handleSlide(payload) {
        this.currentSlideIndex = payload.currentSlide;
        if (this.currentSlideIndex > this.highestViewedSlideIndex) {
          this.highestViewedSlideIndex = this.currentSlideIndex;
        }
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
          this.$refs.slider.slideTo(this.extraFields.contentState.lastViewedSlideIndex)
        );
      },
      updateContentState() {
        this.extraFields.contentState.highestViewedSlideIndex = this.highestViewedSlideIndex;
        this.extraFields.contentState.lastViewedSlideIndex = this.currentSlideIndex;
        this.$emit('updateContentState', this.extraFields.contentState);
      },
      updateProgress() {
        // updateProgress adds the percent to the existing value, so only pass
        // the percentage of progress in this session, not the full percentage.
        const progressPercent =
          this.highestViewedSlideIndex + 1 === this.slides.length
            ? 1.0
            : (this.highestViewedSlideIndex -
                this.extraFields.contentState.highestViewedSlideIndex) /
              this.slides.length;
        this.$emit('updateProgress', progressPercent);
      },
    },
    $trs: {
      exitFullscreen: 'Exit fullscreen',
      enterFullscreen: 'Enter fullscreen',
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
    fill: white;
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
