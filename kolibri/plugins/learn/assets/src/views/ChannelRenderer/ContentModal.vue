<template>

  <Backdrop
    :transitions="true"
    class="backdrop"
    :style="backdropStyle"
  >
    <div
      class="renderer"
      :style="bodyStyle"
    >
      <nav>
        <KToolbar
          ref="toolbar"
          :showIcon="true"
          :style="toolbarStyle"
        >
          <template #icon>
            <KIconButton
              icon="close"
              :color="getThemeToken('textColor')"
              @click="$emit('close')"
            />
          </template>

          <span :style="titleStyle">
            {{ title }}
          </span>
        </KToolbar>
      </nav>

      <main>
        <ContentItem :contentNode="contentNode" />
      </main>
    </div>
  </Backdrop>

</template>


<script>

  import KToolbar from 'kolibri-design-system/lib/KToolbar';
  import Backdrop from 'kolibri/components/Backdrop';
  import ContentItem from './ContentItem';

  export default {
    name: 'ContentModal',
    components: {
      Backdrop,
      ContentItem,
      KToolbar,
    },
    props: {
      contentNode: {
        type: Object,
        required: true,
      },
      channelTheme: {
        type: Object,
        required: false,
        default: null,
      },
    },
    data() {
      return {
        title: this.contentNode.title,
      };
    },
    computed: {
      defaultTheme() {
        return {
          appBarColor: this.$themeTokens.primary,
          textColor: this.$themeTokens.textInverted,
          backdropColor: 'rgba(0, 0, 0, 0.7)',
          backgroundColor: this.$themeTokens.surface,
        };
      },
      toolbarStyle() {
        return {
          backgroundColor: this.getThemeToken('appBarColor'),
        };
      },
      titleStyle() {
        return {
          color: this.getThemeToken('textColor'),
        };
      },
      bodyStyle() {
        return {
          backgroundColor: this.getThemeToken('backgroundColor'),
        };
      },
      backdropStyle() {
        return {
          backgroundColor: this.getThemeToken('backdropColor'),
        };
      },
    },
    methods: {
      getThemeToken(token) {
        return this.channelTheme[token] || this.defaultTheme[token];
      },
    },
  };

</script>


<style lang="scss" scoped>

  .backdrop {
    z-index: 4;
  }

  .renderer {
    z-index: inherit;
    width: 80%;
    max-height: calc(100vh - 80px);
    margin: 40px auto;
    overflow: hidden;
    border-radius: 4px;
  }

  @media (max-width: 960px) {
    .renderer {
      width: 90%;
    }
  }

  @media (max-width: 600px) {
    .renderer {
      width: 100%;
      height: 100vh;
      max-height: 100vh;
      margin: 0;
      border-radius: 0;
    }
  }

</style>
