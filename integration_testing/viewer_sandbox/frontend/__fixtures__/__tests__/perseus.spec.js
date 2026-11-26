import perseus from '../../viewers/perseus';
import fixtures from '../perseus';

describe('Perseus sandbox fixtures', () => {
  it('provides all five items', () => {
    expect(fixtures).toHaveLength(5);
  });

  it.each(['data:image/png;base64,a', 'data:image/png;base64,AA==,extra'])(
    'rejects %s before registering object URLs',
    invalid => {
      const original = URL.createObjectURL;
      const createObjectURL = jest.fn();
      URL.createObjectURL = createObjectURL;
      try {
        expect(() =>
          perseus.createPackageFiles({
            'first.png': 'data:image/png;base64,AA==',
            'second.png': invalid,
          }),
        ).toThrow();
        expect(createObjectURL).not.toHaveBeenCalled();
      } finally {
        URL.createObjectURL = original;
      }
    },
  );

  it.each(fixtures)('packages the assets referenced by $title', ({ item, files }) => {
    expect(JSON.parse(item)).toHaveProperty('question');
    const original = URL.createObjectURL;
    URL.createObjectURL = jest.fn(blob => `blob:${blob.size}`);
    let packageFiles;
    try {
      packageFiles = perseus.createPackageFiles(files);
    } finally {
      URL.createObjectURL = original;
    }
    const references = item.matchAll(/(web\+graphie:)?\$\{☣ LOCALPATH\}\/(images\/[\w.-]+)/g);
    for (const [, graphie, path] of references) {
      const paths = graphie ? [path + '.svg', path + '-data.json'] : [path];
      for (const assetPath of paths) {
        expect(packageFiles[assetPath]).toMatch(/^blob:[1-9]/);
      }
    }
  });
});

describe('Perseus sandbox answer validation', () => {
  it('accepts renderer input under a noncanonical dropdown ID', () => {
    const id = 'dropdown 03';
    const item = { question: { widgets: { [id]: { type: 'dropdown' } } } };
    expect(perseus.validAnswer(item, id, { value: 1 })).toBe(true);
  });

  it('validates group answers using declared child widget types', () => {
    const widgets = { 'dropdown 03': { type: 'dropdown' } };
    const group = { type: 'group', options: { widgets } };
    const item = { question: { widgets: { 'group 1': group } } };
    expect(perseus.validAnswer(item, 'group 1', { 'dropdown 03': { value: 1 } })).toBe(true);
    expect(perseus.validAnswer(item, 'group 1', { 'dropdown 03': { value: '1' } })).toBe(false);
  });

  it('rejects a dropdown selection outside its choices', () => {
    const item = JSON.parse(fixtures.find(fixture => fixture.category === 'Dropdown').item);
    const id = Object.keys(item.question.widgets).find(key => key.startsWith('dropdown'));
    const { length } = item.question.widgets[id].options.choices;
    expect(perseus.validAnswer(item, id, { value: 0 })).toBe(true);
    expect(perseus.validAnswer(item, id, { value: length })).toBe(true);
    expect(perseus.validAnswer(item, id, { value: length + 1 })).toBe(false);
    expect(perseus.validAnswer(item, id, { value: -1 })).toBe(false);
    expect(perseus.validAnswer(item, id, { value: 1.5 })).toBe(false);
  });

  it('requires one answer entry per rubric marker', () => {
    const item = JSON.parse(fixtures.find(fixture => fixture.category === 'Label image').item);
    const [id] = Object.keys(item.question.widgets);
    const markers = item.question.widgets[id].options.markers.map(({ label }) => ({ label }));
    expect(perseus.validAnswer(item, id, { markers })).toBe(true);
    expect(perseus.validAnswer(item, id, { markers: [] })).toBe(false);
  });

  it('requires both absolute-value graph points unless the graph is empty', () => {
    const item = JSON.parse(fixtures.find(fixture => fixture.category === 'Grapher').item);
    const [id] = Object.keys(item.question.widgets);
    const { correct } = item.question.widgets[id].options;
    const input = { type: correct.type, asymptote: null };
    expect(perseus.validAnswer(item, id, { ...input, coords: correct.coords })).toBe(true);
    expect(perseus.validAnswer(item, id, { ...input, coords: null })).toBe(true);
    expect(perseus.validAnswer(item, id, { ...input, coords: [] })).toBe(false);
    expect(perseus.validAnswer(item, id, { ...input, coords: [[0, 1]] })).toBe(false);
  });

  it('accepts a static child in a group answer but no standalone static answer', () => {
    const widgets = {
      'dropdown 1': { type: 'dropdown', static: true },
      'dropdown 2': { type: 'dropdown' },
    };
    const item = { question: { widgets: { 'group 1': { type: 'group', options: { widgets } } } } };
    const answer = { 'dropdown 1': { value: 1 }, 'dropdown 2': { value: 2 } };
    expect(perseus.validAnswer(item, 'group 1', answer)).toBe(true);
    const standalone = { question: { widgets } };
    expect(perseus.validAnswer(standalone, 'dropdown 1', { value: 1 })).toBe(false);
  });

  it('accepts table arrays and rejects input for a missing widget definition', () => {
    const id = 'table 1';
    const item = { question: { widgets: { [id]: { type: 'table' } } } };
    expect(perseus.validAnswer(item, id, [['3']])).toBe(true);
    item.question.widgets[id] = null;
    expect(perseus.validAnswer(item, id, [['3']])).toBe(false);
  });
});
