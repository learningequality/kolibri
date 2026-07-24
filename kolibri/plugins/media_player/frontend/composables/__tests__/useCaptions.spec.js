import { ref } from 'vue';

jest.mock('video.js', () => require('../../test/videojsMock').videojsModuleMock());

/* eslint-disable import-x/first */
import useCaptions from '../useCaptions';
import Settings from '../../utils/settings';
import { createTrack, createFakePlayer } from '../../test/videojsMock';
/* eslint-enable import-x/first */

function createCaptions() {
  return useCaptions(ref(createFakePlayer()));
}

describe('useCaptions', () => {
  beforeEach(() => {
    // Settings persists via Lockr → localStorage; isolate each test.
    window.localStorage.clear();
  });

  it('loads default caption settings (subtitles on, transcript off)', () => {
    const captions = createCaptions();
    expect(captions.subtitles.value).toBe(true);
    expect(captions.transcript.value).toBe(false);
  });

  it('enables the track matching the active language and exposes its cues', () => {
    const captions = createCaptions();
    captions.setLanguage('en');

    const enCues = [{}, {}];
    const en = createTrack({ language: 'en', cues: enCues, activeCues: [enCues[0]] });
    const es = createTrack({ language: 'es', cues: [{}] });
    captions.setTrackList([en, es]);

    expect(en.mode).toBe('showing');
    expect(es.mode).toBe('disabled');
    expect(captions.cues.value).toHaveLength(2);
    expect(captions.activeCueIds.value).toEqual(['en-cue-0']);
  });

  it('persists caption preferences when toggled', () => {
    const captions = createCaptions();
    captions.toggleSubtitles();

    expect(captions.subtitles.value).toBe(false);
    expect(new Settings().captionSubtitles).toBe(false);
  });

  it('toggleTranscript flips transcript state', () => {
    const captions = createCaptions();
    captions.toggleTranscript();
    expect(captions.transcript.value).toBe(true);
  });

  it('setLanguage switches the active caption track', () => {
    const captions = createCaptions();
    const en = createTrack({ language: 'en', cues: [{}, {}] });
    const es = createTrack({ language: 'es', cues: [{}] });
    captions.setLanguage('en');
    captions.setTrackList([en, es]);

    captions.setLanguage('es');

    expect(captions.language.value).toBe('es');
    expect(es.mode).toBe('showing');
    expect(en.mode).toBe('disabled');
    expect(captions.cues.value).toHaveLength(1);
  });

  it('picks up cues that load after a language switch', () => {
    const captions = createCaptions();
    const en = createTrack({ language: 'en', cues: [{}, {}] });
    // Tracks are fetched lazily, so a track only enabled later starts empty.
    const es = createTrack({ language: 'es' });
    captions.setLanguage('en');
    captions.setTrackList([en, es]);

    captions.setLanguage('es');
    expect(captions.cues.value).toEqual([]);

    // The VTT finishes parsing after the switch: addCue is the only signal.
    es.cues = [{}];
    es.addCue({});

    expect(captions.cues.value).toHaveLength(1);
  });

  it('initCaptionState disables captions when no track matches the language', () => {
    const captions = createCaptions();
    captions.setLanguage('fr'); // no track for fr
    captions.setTrackList([createTrack({ language: 'en', cues: [{}] })]);

    captions.initCaptionState();

    expect(captions.subtitles.value).toBe(false);
    expect(captions.transcript.value).toBe(false);
  });

  it('isDefaultTrack compares by short language code', () => {
    const captions = createCaptions();
    captions.setLanguage('en');
    expect(captions.isDefaultTrack('en')).toBe(true);
    expect(captions.isDefaultTrack('es')).toBe(false);
  });

  it('resetState clears cue state', () => {
    const captions = createCaptions();
    captions.setLanguage('en');
    captions.setTrackList([createTrack({ language: 'en', cues: [{}, {}] })]);
    expect(captions.cues.value.length).toBeGreaterThan(0);

    captions.resetState();

    expect(captions.cues.value).toEqual([]);
    expect(captions.activeCueIds.value).toEqual([]);
  });

  it('resetState detaches cuechange listeners so later track events are ignored', () => {
    const captions = createCaptions();
    captions.setLanguage('en');
    const cues = [{}, {}];
    const en = createTrack({ language: 'en', cues, activeCues: [cues[0]] });
    captions.setTrackList([en]);
    expect(captions.activeCueIds.value).toEqual(['en-cue-0']);

    captions.resetState();
    expect(captions.activeCueIds.value).toEqual([]);

    // A cuechange fired after teardown must not repopulate active cues.
    en.activeCues = [cues[1]];
    en.trigger('cuechange');
    expect(captions.activeCueIds.value).toEqual([]);
  });
});
