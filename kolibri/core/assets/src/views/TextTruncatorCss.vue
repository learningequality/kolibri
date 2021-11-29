<template>

  <!--
    Text is wrapped in two `spans`s to allow parent components adding
    padding style directly on `<TextTruncatorCss>` component no matter
    of what truncating technique is used. Otherwise adding padding directly
    would break when using technique (B) since text that should be truncated
    would show in padding area.

    Attributes are inherited by the inner `span` to emulate the same behavior
    like if only one element would wrap the text to allow attributes be applied
    as close as possible to the text element.

    Some width information need to be provided to `<span>s` to allow `text-overflow`
    calculate properly when ellipsis should be added.
  -->
  <span :style="{ display: 'inline-block', maxWidth: '100%' }">
    <span
      v-bind="$attrs"
      :style="{ display: 'inline-block', maxWidth: '100%' }"
      :class="$computedClass(truncate)"
    >
      {{ text }}
    </span>
  </span>

</template>


<script>

  /**
   * Truncates text to a certain number of lines
   * and adds an ellipsis character "…"
   *
   * Internet Explorer note:
   * Depending on length of words of the text, there might
   * be a gap between the last visible word and "…"
   */
  export default {
    name: 'TextTruncatorCss',
    inheritAttrs: false,
    props: {
      text: {
        type: String,
        required: true,
      },
      maxLines: {
        type: Number,
        required: false,
        default: 1,
      },
      /**
       * Text line height in rem.
       * Used only for Internet Explorer fallback.
       */
      lineHeightIE: {
        type: Number,
        required: false,
        default: 1.4,
      },
    },
    computed: {
      truncate() {
        /*
          (A)
          For one line, use standard ellipsis text overflow
          that works well for such scenario
        */
        if (this.maxLines === 1) {
          return {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          };
        }

        // 54 is random number only to be able to define `supports` test condition
        if ('CSS' in window && CSS.supports && CSS.supports('-webkit-line-clamp: 54')) {
          /*
            (B)
            For multiple lines, use line clamp in browsers that support it
            (https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-line-clamp)
          */
          return {
            overflow: 'hidden',
            display: '-webkit-box',
            '-webkit-line-clamp': `${this.maxLines}`,
            '-webkit-box-orient': 'vertical',
            // needed to make line clamp work for very long word with no spaces
            overflowWrap: 'break-word',
          };
        } else {
          /*
            (C)
            Fallback for multiple lines in Internet Explorer and some older versions
            of other browsers that don't support line clamp
            (https://caniuse.com/mdn-css_properties_-webkit-line-clamp).
            Calculate max height and add "..." in `::before` while covering it with
            white rectangle defined in `::after` when text doesn't need to be truncated.
            Adapted from https://hackingui.com/a-pure-css-solution-for-multiline-text-truncation/
            and https://css-tricks.com/line-clampin/#the-hide-overflow-place-ellipsis-pure-css-way.
          */
          const ellipsisWidth = '1rem';
          return {
            overflow: 'hidden',
            position: 'relative',
            lineHeight: `${this.lineHeightIE}rem`,
            maxHeight: `${this.maxLines * this.lineHeightIE}rem`,
            // needed to make truncation work for very long word with no spaces
            // `word-wrap` is a legacy name for `overflow-wrap` that needs to be used for IE
            wordWrap: 'break-word',
            // create space for "..."
            paddingRight: ellipsisWidth,
            marginRigth: `-${ellipsisWidth}`,
            '::before': {
              content: "'…'",
              position: 'absolute',
              right: 0,
              bottom: 0,
            },
            // cover "..." with white rectangle when text
            // doesn't need to be truncated
            '::after': {
              content: "''",
              position: 'absolute',
              right: 0,
              width: ellipsisWidth,
              height: '100%',
              background: 'white',
            },
          };
        }
      },
    },
  };

</script>
