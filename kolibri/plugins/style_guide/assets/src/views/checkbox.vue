
<script>

export default {
  name: 'checkbox',
  introduction: 'an amazing checkbox',
  description: `
  This \`checkbox\` is amazing, you should _check_ it out.
  `,
  token: `<checkbox label="foo"></checkbox>`,
  props: {
    label: {
      type: String,
      default: '',
      note: "a label to be appended after the checkbox"
    }
  }
}

</script>
