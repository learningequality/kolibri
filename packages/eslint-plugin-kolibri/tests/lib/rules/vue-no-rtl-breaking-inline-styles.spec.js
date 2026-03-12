const RuleTester = require('eslint').RuleTester;
const rule = require('../../../lib/rules/vue-no-rtl-breaking-inline-styles');
const { vueLanguageOptions } = require('../../helpers');

const tester = new RuleTester({
  languageOptions: vueLanguageOptions,
});

tester.run('vue-no-rtl-breaking-inline-styles', rule, {
  valid: [
    // ===== Valid: No style attributes =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div>No styles here</div>
        </template>
      `,
    },

    // ===== Valid: CSS classes (recommended approach from docs) =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div class="small-left-margin">Content</div>
        </template>
      `,
    },

    // ===== Valid: Safe CSS properties (non-directional) =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div style="color: red; background: blue; width: 100px; height: 50px">
            Content
          </div>
        </template>
      `,
    },

    // ===== Valid: Safe dynamic styles (theme tokens from docs) =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="{ color: $themeTokens.primary, width: '100%' }">
            Content
          </div>
        </template>
      `,
    },

    // ===== Valid: Computed property reference (recommended pattern from docs) =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <KIcon :style="iconStyle" />
        </template>
        <script>
          export default {
            computed: {
              iconStyle() {
                return {
                  [this.isRtl ? 'marginRight' : 'marginLeft']: '8px'
                };
              }
            }
          }
        </script>
      `,
      languageOptions: { sourceType: 'module' },
    },

    // ===== Valid: Simple identifier reference =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="dynamicStyles">Content</div>
        </template>
      `,
    },

    // ===== Valid: Safe positioning properties (top, bottom) =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div style="top: 0; bottom: 0">Content</div>
        </template>
      `,
    },

    // ===== Valid: Safe dynamic binding with top/bottom =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="{ top: '0px', bottom: '10px', zIndex: 999 }">
            Content
          </div>
        </template>
      `,
    },

    // ===== Valid: text-align with safe values =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div style="text-align: center">Content</div>
        </template>
      `,
    },

    // ===== Valid: textAlign with safe values =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="{ textAlign: 'center' }">Content</div>
        </template>
      `,
    },

    // ===== Valid: Method call returning styles =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="getStyles()">Content</div>
        </template>
      `,
    },

    // ===== Valid: Array with identifier references =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="[baseStyle, extraStyle]">Content</div>
        </template>
      `,
    },

    // ===== Valid: Margin without directional (margin shorthand) =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div style="margin: 10px">Content</div>
        </template>
      `,
    },

    // ===== Valid: v-bind shorthand with safe properties =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="{ marginTop: '10px', marginBottom: '10px' }">
            Content
          </div>
        </template>
      `,
    },

    // ===== Valid: float with safe value (none) =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div style="float: none">Content</div>
        </template>
      `,
    },

    // ===== Valid: clear with safe value (both) =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div style="clear: both">Content</div>
        </template>
      `,
    },

    // ===== Valid: clear with safe value (none) =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="{ clear: 'none' }">Content</div>
        </template>
      `,
    },

    // ===== Valid: Non-directional border-radius =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div style="border-radius: 5px">Content</div>
        </template>
      `,
    },

    // ===== Valid: isRtl ternary in computed property key (RTL-aware pattern) =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <KIcon :style="{ [isRtl ? 'marginRight' : 'marginLeft']: '8px' }" />
        </template>
      `,
    },
  ],

  invalid: [
    // ===== Invalid: Static inline styles from documentation examples =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div style="margin-left: 8px">Content</div>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingStaticStyles',
          line: 3,
        },
      ],
    },

    {
      filename: 'test.vue',
      code: `
        <template>
          <div style="text-align: right">Content</div>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingStaticStyles',
        },
      ],
    },

    {
      filename: 'test.vue',
      code: `
        <template>
          <div style="float: left">Content</div>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingStaticStyles',
        },
      ],
    },

    // ===== Invalid: Dynamic bindings from documentation examples =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="{ marginLeft: '8px' }">Content</div>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingInlineStyles',
          data: { property: 'marginLeft' },
        },
      ],
    },

    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="{ paddingRight: '16px' }">Content</div>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingInlineStyles',
          data: { property: 'paddingRight' },
        },
      ],
    },

    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="{ textAlign: 'right' }">Content</div>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingInlineStyles',
          data: { property: 'textAlign' },
        },
      ],
    },

    // ===== Invalid: Real-world example from codebase =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <h1 :style="{ marginLeft: '-8px' }">
            Title
          </h1>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingInlineStyles',
          data: { property: 'marginLeft' },
        },
      ],
    },

    // ===== Invalid: Static style with margin-right =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div style="margin-right: 20px">Content</div>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingStaticStyles',
        },
      ],
    },

    // ===== Invalid: Static style with padding-left =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div style="padding-left: 15px">Content</div>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingStaticStyles',
        },
      ],
    },

    // ===== Invalid: Static style with padding-right =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div style="padding-right: 10px">Content</div>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingStaticStyles',
        },
      ],
    },

    // ===== Invalid: Static style with left positioning =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div style="left: 0; top: 0">Content</div>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingStaticStyles',
        },
      ],
    },

    // ===== Invalid: Static style with right positioning =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div style="right: 10px">Content</div>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingStaticStyles',
        },
      ],
    },

    // ===== Invalid: Dynamic binding with kebab-case property in string =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="{ 'margin-left': '8px' }">Content</div>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingInlineStyles',
          data: { property: 'margin-left' },
        },
      ],
    },

    // ===== Invalid: Dynamic binding with 'text-align' =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="{ 'text-align': 'right' }">Content</div>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingInlineStyles',
          data: { property: 'text-align' },
        },
      ],
    },

    // ===== Invalid: Array with RTL-breaking object =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="[{ marginLeft: '10px' }]">Content</div>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingInlineStyles',
          data: { property: 'marginLeft' },
        },
      ],
    },

    // ===== Invalid: Ternary with RTL-breaking properties in both branches =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="condition ? { marginLeft: '10px' } : { marginRight: '10px' }">
            Content
          </div>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingInlineStyles',
          data: { property: 'marginLeft' },
        },
        {
          messageId: 'noRtlBreakingInlineStyles',
          data: { property: 'marginRight' },
        },
      ],
    },

    // ===== Invalid: Logical expression with RTL-breaking property =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="showStyle && { paddingLeft: '20px' }">Content</div>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingInlineStyles',
          data: { property: 'paddingLeft' },
        },
      ],
    },

    // ===== Invalid: Multiple RTL-breaking properties in one object =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="{ marginLeft: '5px', paddingRight: '10px' }">
            Content
          </div>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingInlineStyles',
          data: { property: 'marginLeft' },
        },
        {
          messageId: 'noRtlBreakingInlineStyles',
          data: { property: 'paddingRight' },
        },
      ],
    },

    // ===== Invalid: Border directional properties =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="{ borderLeft: '1px solid black' }">Content</div>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingInlineStyles',
          data: { property: 'borderLeft' },
        },
      ],
    },

    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="{ borderRight: '1px solid red' }">Content</div>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingInlineStyles',
          data: { property: 'borderRight' },
        },
      ],
    },

    // ===== Invalid: Static style with multiple violations =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div style="margin-left: 8px; padding-right: 10px; text-align: right">
            Content
          </div>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingStaticStyles',
        },
      ],
    },

    // ===== Invalid: Float property =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="{ float: 'right' }">Content</div>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingInlineStyles',
          data: { property: 'float' },
        },
      ],
    },

    // ===== Invalid: Static text-align left =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div style="text-align: left">Content</div>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingStaticStyles',
        },
      ],
    },

    // ===== Invalid: Dynamic textAlign left =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="{ textAlign: 'left' }">Content</div>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingInlineStyles',
          data: { property: 'textAlign' },
        },
      ],
    },

    // ===== Invalid: Computed key ternary WITHOUT isRtl is still flagged =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <KIcon :style="{ [someCondition ? 'marginRight' : 'marginLeft']: '8px' }" />
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingInlineStyles',
        },
        {
          messageId: 'noRtlBreakingInlineStyles',
        },
      ],
    },

    // ===== Invalid: isRtl ternary in VALUE does NOT make directional property safe =====
    // marginLeft is still directional regardless of what value it gets
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="{ marginLeft: isRtl ? 'auto' : '8px' }">Content</div>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingInlineStyles',
          data: { property: 'marginLeft' },
        },
      ],
    },

    // ===== Invalid: Border-radius directional properties (static) =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div style="border-top-left-radius: 5px">Content</div>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingStaticStyles',
        },
      ],
    },

    // ===== Invalid: Border-radius directional properties (dynamic camelCase) =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="{ borderTopRightRadius: '5px' }">Content</div>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingInlineStyles',
          data: { property: 'borderTopRightRadius' },
        },
      ],
    },

    // ===== Invalid: Border-radius bottom-left =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="{ borderBottomLeftRadius: '8px' }">Content</div>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingInlineStyles',
          data: { property: 'borderBottomLeftRadius' },
        },
      ],
    },

    // ===== Invalid: Border-radius bottom-right =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="{ 'border-bottom-right-radius': '8px' }">Content</div>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingInlineStyles',
          data: { property: 'border-bottom-right-radius' },
        },
      ],
    },

    // ===== Invalid: Scroll-margin-left =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="{ scrollMarginLeft: '10px' }">Content</div>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingInlineStyles',
          data: { property: 'scrollMarginLeft' },
        },
      ],
    },

    // ===== Invalid: Scroll-padding-right (kebab-case) =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div style="scroll-padding-right: 5px">Content</div>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingStaticStyles',
        },
      ],
    },

    // ===== Invalid: clear with directional value (left) =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div style="clear: left">Content</div>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingStaticStyles',
        },
      ],
    },

    // ===== Invalid: clear with directional value (right) - dynamic =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="{ clear: 'right' }">Content</div>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingInlineStyles',
          data: { property: 'clear' },
        },
      ],
    },

    // ===== Invalid: kebab-case text-align with directional value =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="{ 'text-align': 'left' }">Content</div>
        </template>
      `,
      errors: [
        {
          messageId: 'noRtlBreakingInlineStyles',
          data: { property: 'text-align' },
        },
      ],
    },
  ],
});
