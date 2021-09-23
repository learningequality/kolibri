<template>

  <!--
    Text is wrapped in two `div`s to allow parent components adding
    padding style directly on `<TextTruncatorCss>` component no matter
    of what truncating technique is used. Otherwise adding padding directly
    would break when using technique (B) since text that should be truncated
    would show in padding area.
  -->
  <div>
    <div :class="$computedClass(truncate)">
      {{ text }}
    </div>
  </div>

</template>


<script>

  /**
   * Truncates text to a certain number of lines and adds "..."
   *
   * This is a pure CSS alternative to `TextTruncator` for simpler
   * use cases like card titles since `TextTruncator` is causing performance
   * issues (https://github.com/learningequality/kolibri/issues/8124)
   * and thus its usage is currently not recommended for larger
   * amounts of instances on one page.
   *
   * Compared to `TextTruncator` there are two disadvantages:
   * - depending on length of words of the text, there might be a gap
   *   between the last visible word and "..." in Internet Explorer
   *   and old versions of some other browsers (see implementation comments)
   * - it currently doesn't offer "View all"/"View less" functionality
   */
  export default {
    name: 'TextTruncatorCss',
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
              content: "'...'",
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
              height: '50%',
              background: 'white',
            },
          };
        }
      },
    },
  };

</script>
