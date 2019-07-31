<template>

  <div class="block-wrapper">
    <div class="color-block" :style="{backgroundColor: value}"></div>
    <div class="code name">
      <code>{{ displayName }}</code>
    </div>
    <div class="code value">
      <code>{{ value }}<span v-if="tokenSource"> ({{ tokenSource }})</span></code>
    </div>
    <p v-if="$slots.default" class="description">
      <slot></slot>
    </p>
  </div>

</template>


<script>

  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';

  const TOKENS = '$themeTokens.';
  const BRAND = '$themeBrand.';
  const PALETTE = '$themePalette.';

  export default {
    name: 'ColorBlock',
    mixins: [themeMixin],
    props: {
      name: {
        type: String,
        required: true,
      },
    },
    computed: {
      displayName() {
        return this.name
          .replace(TOKENS, 'tokens.')
          .replace(BRAND, 'brand.')
          .replace(PALETTE, 'palette.');
      },
      value() {
        return eval(`this.${this.name}`);
      },
      tokenSource() {
        if (!this.name.startsWith(TOKENS)) {
          return null;
        }
        const token = this.name.replace(TOKENS, '');
        return this.$themeTokenMapping[token];
      },
    },
  };

</script>


<style lang="scss" scoped>

  .block-wrapper {
    position: relative;
    padding: 4px;
    margin-bottom: 8px;
  }

  .color-block {
    position: absolute;
    width: 40px;
    height: 40px;
    color: black;
    border: 1px solid #212121;
    border-radius: 4px;
  }

  .code {
    margin-left: 50px;

    code {
      background-color: white;
    }
  }

  .name {
    margin-top: 2px;
    font-weight: bold;
  }

  .value {
    font-size: 10px;
  }

  .description {
    margin-top: 8px;
    margin-bottom: 0;
    margin-left: 50px;
    font-size: smaller;
  }

</style>
