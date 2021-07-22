function getVueSFCName(node) {
  if (node.type === 'ObjectProperty') {
    if (node.key.name === 'name') {
      return node.value.value;
    }
  }
}

module.exports = {
  getVueSFCName,
};
