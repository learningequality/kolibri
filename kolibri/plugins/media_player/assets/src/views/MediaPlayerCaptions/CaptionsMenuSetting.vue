<template>

  <li class="caption-menu-setting">
    <KButton
      appearance="flat-button"
      :appearanceOverrides="buttonStyle"
      role="menuitem"
      @click="$emit('toggle', !open)"
    >
      <mat-svg
        v-show="open"
        category="navigation"
        name="chevron_left"
        class="left"
        fill="#ffffff"
      />
      <strong class="title">{{ title }}</strong>
      <mat-svg
        v-show="!open"
        category="navigation"
        name="chevron_right"
        class="right"
        fill="#ffffff"
      />
      <span v-show="!open" class="value">{{ currentValue }}</span>
    </KButton>
    <div
      v-show="open"
      :aria-hidden="(!open).toString()"
    >
      <slot></slot>
    </div>
  </li>

</template>


<script>

  export default {
    name: 'CaptionsMenuSetting',

    props: {
      title: {
        type: String,
        required: true,
      },
      currentValue: {
        type: String,
        required: true,
      },
      open: {
        type: Boolean,
        required: true,
      },
    },

    computed: {
      buttonStyle() {
        return {
          color: '#fff',
          margin: '0',
          padding: '8px',
          'padding-left': this.open ? '8px' : '16px',
          'text-align': 'left',
          width: '100%',
          ':hover': {
            color: this.$themeTokens.text,
          },
          ':hover > svg': {
            fill: this.$themeTokens.text,
          },
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';
  @import '../videojs-style/variables';

  li.caption-menu-setting {
    padding: 0 !important;
    text-align: left;

    button > * {
      display: inline-block;
      vertical-align: middle;
    }

    .value {
      font-size: 13px;
      font-weight: normal;
      text-transform: none;
    }

    .value,
    svg.right {
      float: right;
    }

    svg {
      margin: 5px 0;
      transition: fill ease $core-time;
    }
  }

</style>
