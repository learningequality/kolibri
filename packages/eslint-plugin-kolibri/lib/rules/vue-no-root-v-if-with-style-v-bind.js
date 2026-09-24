/*
 * Vue 2.7 stops updating a style block's `v-bind()` when the bound element is the
 * template root and is removed and re-added, for example by a `v-if`. Wrap the
 * conditional element in a plain one to avoid it.
 *
 * `vue/no-root-v-if` reports every root `v-if`. Most of those cannot hit the bug, because
 * a component with no `v-bind()` in its `<style>` block has nothing to stop updating. This
 * hands the work to that rule only when a `<style>` block does contain one.
 */

const pluginVue = require('eslint-plugin-vue');

const UPSTREAM_RULE = 'no-root-v-if';

/**
 * The upstream rule this delegates to.
 *
 * Looked up on use rather than on load. `requireindex` loads every rule in this plugin
 * eagerly, so reading `.meta` off a missing rule at load would take down the whole plugin,
 * and with it all linting, over one rule. `upstreamRulePresent` in the tests fails first
 * if an `eslint-plugin-vue` upgrade ever removes it.
 * @returns {object}
 * @throws {Error} When `eslint-plugin-vue` no longer provides the rule.
 */
function upstreamRule() {
  const rule = (pluginVue.rules || {})[UPSTREAM_RULE];
  if (!rule) {
    throw new Error(
      `eslint-plugin-vue no longer provides \`vue/${UPSTREAM_RULE}\`, which ` +
        '`kolibri/vue-no-root-v-if-with-style-v-bind` delegates to. Either pin ' +
        'eslint-plugin-vue, or reimplement the root check in that rule.',
    );
  }
  return rule;
}

function hasStyleVBind(sourceCode) {
  const parserServices = sourceCode.parserServices || {};
  const documentFragment =
    parserServices.getDocumentFragment && parserServices.getDocumentFragment();
  if (!documentFragment) {
    return false;
  }
  return documentFragment.children.some(
    child =>
      child.type === 'VElement' &&
      child.name === 'style' &&
      child.children.some(node => node.type === 'VExpressionContainer' && node.expression),
  );
}

// declared here rather than spread from upstream, so loading this file touches nothing
// that an eslint-plugin-vue upgrade can take away
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'disallow `v-if` on the root element of a component whose `<style>` block uses `v-bind()`',
    },
    fixable: null,
    schema: [],
    messages: {
      // replaces the upstream text, which does not say why the root is the problem
      noRootVIf:
        "`v-if` on the root element stops this component's `<style>` block `v-bind()` from " +
        'updating in Vue 2.7. Wrap the element in a plain, non-conditional one.',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();
    if (!hasStyleVBind(sourceCode)) {
      return {};
    }
    return upstreamRule().create(context);
  },
};

module.exports.upstreamRuleName = UPSTREAM_RULE;
