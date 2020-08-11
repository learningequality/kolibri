import get from 'lodash/get';

export default {
  name: 'KOptionalText',
  functional: true,
  props: {
    // eslint-disable-next-line
    text: {
      type: String,
      required: false,
    },
  },
  render(createElement, context) {
    // If the 'text' prop or default slot is an empty string, we render KEmptyPlaceholder
    let innerText;
    if (typeof context.props.text === 'string') {
      innerText = context.props.text.trim();
    } else {
      innerText = get(context.slots(), 'default[0].text', '').trim();
    }
    if (innerText === '') {
      return createElement('KEmptyPlaceholder');
    } else {
      return createElement('span', [innerText]);
    }
  },
};
