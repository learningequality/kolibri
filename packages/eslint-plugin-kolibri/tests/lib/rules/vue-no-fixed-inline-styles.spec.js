const RuleTester = require('eslint').RuleTester;
const rule = require('../../../lib/rules/vue-no-fixed-inline-styles');
const { vueLanguageOptions } = require('../../helpers');

const tester = new RuleTester({
  languageOptions: vueLanguageOptions,
});

tester.run('vue-no-fixed-inline-styles', rule, {
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

    // ===== Valid: CSS classes (recommended approach) =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div class="my-class">Content</div>
        </template>
      `,
    },

    // ===== Valid: Dynamic :style with computed property reference =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="computedStyles">Content</div>
        </template>
      `,
    },

    // ===== Valid: Dynamic :style with member expression =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="this.computedStyles">Content</div>
        </template>
      `,
    },

    // ===== Valid: Dynamic :style with method call =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="getStyles()">Content</div>
        </template>
      `,
    },

    // ===== Valid: Dynamic :style with one dynamic value =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="{ color: themeColor, marginTop: '8px' }">Content</div>
        </template>
      `,
    },

    // ===== Valid: Dynamic :style with variable reference =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="{ color: myColor }">Content</div>
        </template>
      `,
    },

    // ===== Valid: Dynamic :style with ternary =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="{ color: isActive ? 'red' : 'blue' }">Content</div>
        </template>
      `,
    },

    // ===== Valid: Dynamic :style with spread =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="{ ...baseStyles, color: 'red' }">Content</div>
        </template>
      `,
    },

    // ===== Valid: Dynamic :style array with identifier references =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="[baseStyle, extraStyle]">Content</div>
        </template>
      `,
    },

    // ===== Valid: Dynamic :style array with one dynamic element =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="[baseStyle, { color: dynamicColor }]">Content</div>
        </template>
      `,
    },

    // ===== Valid: :style with computed property returning object with ternary key =====
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

    // ===== Valid: Complex dynamic expression =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="Object.assign({}, base, { color: getColor() })">Content</div>
        </template>
      `,
    },

    // ===== Valid: :style with logical expression =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="condition && { color: 'red' }">Content</div>
        </template>
      `,
    },

    // ===== Valid: :style with template literal containing interpolation =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="{ color: `rgb(${r}, ${g}, ${b})` }">Content</div>
        </template>
      `,
    },
  ],

  invalid: [
    // ===== Invalid: Literal style attribute =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div style="color: red">Content</div>
        </template>
      `,
      errors: [{ messageId: 'noFixedInlineStyle' }],
    },

    // ===== Invalid: Literal style attribute with multiple properties =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div style="color: red; margin-top: 8px">Content</div>
        </template>
      `,
      errors: [{ messageId: 'noFixedInlineStyle' }],
    },

    // ===== Invalid: Literal :style object with literal values =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="{ color: 'red', marginTop: '8px' }">Content</div>
        </template>
      `,
      errors: [{ messageId: 'noFixedVStyleObject' }],
    },

    // ===== Invalid: Literal :style object with single property =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="{ color: 'red' }">Content</div>
        </template>
      `,
      errors: [{ messageId: 'noFixedVStyleObject' }],
    },

    // ===== Invalid: Literal :style object with numeric value =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="{ width: 100, height: 50 }">Content</div>
        </template>
      `,
      errors: [{ messageId: 'noFixedVStyleObject' }],
    },

    // ===== Invalid: Literal :style object with var() string =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="{ color: 'var(--tokens-primary)' }">Content</div>
        </template>
      `,
      errors: [{ messageId: 'noFixedVStyleObject' }],
    },

    // ===== Invalid: Literal :style array with literal objects =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="[{ color: 'red' }, { marginTop: '8px' }]">Content</div>
        </template>
      `,
      errors: [{ messageId: 'noFixedVStyleArray' }],
    },

    // ===== Invalid: Literal :style array with single literal object =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="[{ color: 'red' }]">Content</div>
        </template>
      `,
      errors: [{ messageId: 'noFixedVStyleArray' }],
    },

    // ===== Invalid: Template literal without placeholders =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="{ color: `red` }">Content</div>
        </template>
      `,
      errors: [{ messageId: 'noFixedVStyleObject' }],
    },

    // ===== Invalid: Template literal without placeholders in array =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="[{ color: `red` }]">Content</div>
        </template>
      `,
      errors: [{ messageId: 'noFixedVStyleArray' }],
    },

    // ===== Invalid: Mixed literal and dynamic in object (should be reported because it's not all static) =====
    // Wait - according to the spec, if there's ONE dynamic value, it should NOT be reported
    // This test verifies that mixed static/dynamic is NOT reported (it's dynamic)
    // {
    //   filename: 'test.vue',
    //   code: `
    //     <template>
    //       <div :style="{ color: dynamicColor, marginTop: '8px' }">Content</div>
    //     </template>
    //   `,
    //   errors: [], // Should NOT report because it has a dynamic value
    // },

    // ===== Invalid: Multiple static style attributes =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div style="color: red">
            <span style="margin-top: 8px">Content</span>
          </div>
        </template>
      `,
      errors: [
        { messageId: 'noFixedInlineStyle' },
        { messageId: 'noFixedInlineStyle' },
      ],
    },

    // ===== Invalid: Static object with var() string =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="{ background: 'var(--palette-grey-v100)', color: 'var(--tokens-text)' }">Content</div>
        </template>
      `,
      errors: [{ messageId: 'noFixedVStyleObject' }],
    },

    // ===== Invalid: Static array with var() strings =====
    {
      filename: 'test.vue',
      code: `
        <template>
          <div :style="[{ background: 'var(--tokens-success)' }, { color: 'var(--tokens-textInverted)' }]">Content</div>
        </template>
      `,
      errors: [{ messageId: 'noFixedVStyleArray' }],
    },
  ],
});