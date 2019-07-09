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
            <template v-for="kind in kinds">
              <li :key="kind.id" class="vjs-menu-item" role="menuitem">
                <KCheckbox
                  :label="kind.name"
                  :checked="activeKinds[kind.id]"
                  role="menuitem"
                  @change="handleKindChange(kind.id, $event)"
                />
              </li>
            </template>
          </ul>
        </CaptionsMenuSetting>
        <CaptionsMenuSetting
          v-show="!isKindOpen"
          :title="$tr('language')"
          :currentValue="activeLanguageName"
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

  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import KCheckbox from 'kolibri.coreVue.components.KCheckbox';
  import constants from '../../constants.json';
  import Settings from '../../utils/settings';
  import CaptionsMenuSetting from './CaptionsMenuSetting';

  export default {
    name: 'CaptionsMenu',

    components: { KCheckbox, CaptionsMenuSetting },
    mixins: [themeMixin],

    props: {
      settings: {
        type: Settings,
        required: true,
      },
    },

    data: function() {
      return {
        open: false,

        kinds: [
          {
            id: constants.KIND_SUBTITLES,
            name: this.$tr('subtitles'),
          },
          {
            id: constants.KIND_TRANSCRIPT,
            name: this.$tr('transcript'),
          },
        ],

        isKindOpen: false,
        isLanguageOpen: false,

        activeKinds: {
          [constants.KIND_SUBTITLES]: false,
          [constants.KIND_TRANSCRIPT]: false,
        },
        // activeLanguage: null,
      };
    },

    computed: {
      activeKindNames() {
        const kindNames = this.kinds
          .filter(kind => this.activeKinds[kind.id])
          .map(kind => kind.name);

        return kindNames.length ? kindNames.join(', ') : 'None';
      },

      activeLanguageName() {
        return 'Todo';
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

    created() {
      this.settings.captionKinds.forEach(kind => {
        this.activeKinds[kind] = true;
      });
    },

    methods: {
      /**
       * @param {String} kind
       * @param {Boolean} isActive
       */
      handleKindChange(kind, isActive) {
        this.$emit('changeKind', kind, isActive);
      },

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
