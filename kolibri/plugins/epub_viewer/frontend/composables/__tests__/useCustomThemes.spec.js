import Lockr from 'lockr';
import useCustomThemes from '../useCustomThemes';
import { CUSTOM_THEMES_STORAGE_KEY } from '../../views/EpubConstants';

describe('useCustomThemes', () => {
  beforeEach(() => {
    // The map lives at module scope, so reset the shared state between tests.
    useCustomThemes().customThemes.value = {};
    Lockr.rm(CUSTOM_THEMES_STORAGE_KEY);
  });

  it('shares one reactive map across all consumers', () => {
    const a = useCustomThemes();
    const b = useCustomThemes();

    const created = a.createCustomTheme({ name: 'Shared' });

    expect(b.customThemes.value[created.id]).toEqual(created);
  });

  it('creates a theme under a generated id and persists it', () => {
    const { createCustomTheme, customThemes } = useCustomThemes();

    const created = createCustomTheme({ name: 'Day', backgroundColor: '#ffffff' });

    expect(created.id).toEqual(expect.any(String));
    expect(created.name).toBe('Day');
    expect(customThemes.value[created.id]).toEqual(created);
    expect(Lockr.get(CUSTOM_THEMES_STORAGE_KEY)[created.id]).toEqual(created);
  });

  it('assigns a distinct id to each created theme', () => {
    const { createCustomTheme } = useCustomThemes();

    const first = createCustomTheme({ name: 'A' });
    const second = createCustomTheme({ name: 'B' });

    expect(first.id).not.toBe(second.id);
  });

  it('updates an existing theme in place, keeping its id', () => {
    const { createCustomTheme, updateCustomTheme, customThemes } = useCustomThemes();
    const created = createCustomTheme({ name: 'A', backgroundColor: '#000000' });

    const updated = updateCustomTheme(created.id, { name: 'Renamed', backgroundColor: '#ffffff' });

    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe('Renamed');
    expect(Object.keys(customThemes.value)).toEqual([created.id]);
    expect(Lockr.get(CUSTOM_THEMES_STORAGE_KEY)[created.id].name).toBe('Renamed');
  });

  it('removes a theme by id and persists the removal', () => {
    const { createCustomTheme, removeCustomTheme, customThemes } = useCustomThemes();
    const created = createCustomTheme({ name: 'A' });

    removeCustomTheme(created.id);

    expect(customThemes.value[created.id]).toBeUndefined();
    expect(Lockr.get(CUSTOM_THEMES_STORAGE_KEY)).toEqual({});
  });

  it('detects a duplicate name', () => {
    const { createCustomTheme, isDuplicateName } = useCustomThemes();
    createCustomTheme({ name: 'Taken' });

    expect(isDuplicateName('Taken')).toBe(true);
    expect(isDuplicateName('Free')).toBe(false);
  });

  it('excludes a given id from the duplicate-name check', () => {
    // Editing a theme without renaming it must not flag the theme against itself.
    const { createCustomTheme, isDuplicateName } = useCustomThemes();
    const created = createCustomTheme({ name: 'Taken' });

    expect(isDuplicateName('Taken', created.id)).toBe(false);
  });
});
