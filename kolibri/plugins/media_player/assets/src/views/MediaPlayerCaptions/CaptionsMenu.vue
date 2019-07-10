<template>

  <div
    v-show="open"
    class="vjs-menu captions-menu"
    aria-hidden="true"
  >
    <div class="vjs-menu-content">
      <ul role="menu" class="caption-settings-list">
        <CaptionsMenuSetting
          v-show="!isLanguageOpen"
          :title="$tr('format')"
          :currentValue="activeKindNames"
          :open="isKindOpen"
          @toggle="isKindOpen = $event"
        >
          <ul role="menu">
            <li class="vjs-menu-item" role="menuitem">
              <KCheckbox
                :label="$tr('subtitles')"
                :checked="subtitles"
                role="menuitem"
                @change="toggleSubtitles"
              />
            </li>
            <li class="vjs-menu-item" role="menuitem">
              <KCheckbox
                :label="$tr('transcript')"
                :checked="transcript"
                role="menuitem"
                @change="toggleTranscript"
              />
            </li>
          </ul>
        </CaptionsMenuSetting>
        <CaptionsMenuSetting
          v-show="!isKindOpen"
          :title="$tr('language')"
          :currentValue="languageLabel"
          :open="isLanguageOpen"
          @toggle="isLanguageOpen = $event"
        >
          <ul ref="contentEl">
          <!-- Languages get added dynamically through video.js -->
          </ul>
        </CaptionsMenuSetting>
      </ul>
    </div>
  </div>

</template>


<script>

  import { mapState, mapActions, mapGetters } from 'vuex';
  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import KCheckbox from 'kolibri.coreVue.components.KCheckbox';
  import CaptionsMenuSetting from './CaptionsMenuSetting';

  const KINDS = ['subtitles', 'transcript'];

  export default {
    name: 'CaptionsMenu',

    components: { KCheckbox, CaptionsMenuSetting },
    mixins: [themeMixin],

    data: function() {
      return {
        open: false,

        isKindOpen: false,
        isLanguageOpen: false,
      };
    },

    computed: {
      ...mapState('mediaPlayer/captions', ['subtitles', 'transcript']),
      ...mapGetters('mediaPlayer/captions', ['languageLabel']),
      activeKindNames() {
        const kindNames = KINDS.filter(kind => this[kind]).map(kind => this.$tr(kind));
        return kindNames.length ? kindNames.join(', ') : this.$tr('none');
      },
    },

    watch: {
      open(open) {
        if (!open) {
          this.isKindOpen = false;
          this.isLanguageOpen = false;
        }
      },
    },

    methods: {
      ...mapActions('mediaPlayer/captions', ['toggleSubtitles', 'toggleTranscript']),

      /**
       * @public
       * @return {Element}
       */
      contentEl() {
        return this.$refs.contentEl;
      },

      /**
       * @public
       */
      show() {
        this.open = true;
      },

      /**
       * @public
       */
      hide() {
        this.open = false;
      },

      /**
       * @public
       * @return {boolean}
       */
      showing() {
        return this.open;
      },
    },
    $trs: {
      format: 'Format',
      language: 'Language',
      languages: 'Languages',
      subtitles: 'Subtitles',
      transcript: 'Transcript',
      none: 'None',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';
  @import '../videojs-style/variables';

  .vjs-menu {
    position: absolute;
    bottom: 3.25em;
    left: -12em;

    /* for consistency, use `em` since video.js defines these that way */
    width: 20em;
    background: $video-player-color !important;
  }

  .custom-skin .vjs-menu /deep/ ul {
    padding: 0;

    ul {
      padding: 0 16px;

      li {
        padding: 8px 5px;
        font-size: 1rem;
        text-transform: none;
      }
    }
  }

  /deep/ .k-checkbox-container,
  /deep/ .k-radio-button {
    margin: 0;
  }

</style>
