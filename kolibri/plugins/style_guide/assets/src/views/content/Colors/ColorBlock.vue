<template>

  <div class="block-wrapper">
    <div class="color-block" :style="{backgroundColor: value}"></div>
    <div class="code name">
      <code>{{ name }}</code>
    </div>
    <div class="code value">
      <code v-if="tokenSource">{{ tokenSource }}</code>
      <code v-else>{{ value }}</code>
    </div>
    <p v-if="$slots.default" class="description">
      <slot></slot>
    </p>
  </div>

</template>


<script>

  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';

  const TOKENS = 'tokens.';

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
      value() {
        const code = this.name
          .replace(TOKENS, '$themeTokens.')
          .replace('brand.', '$themeBrand.')
          .replace('palette.', '$themePalette.');
        return eval(`this.${code}`);
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
