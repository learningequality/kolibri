import flatMap from 'lodash/flatMap';
import Mediator from '../src/mediator';
import SCORM from '../src/SCORM';

describe('SCORM hashi shim', () => {
  let scorm;
  let mediator;
  beforeEach(() => {
    mediator = new Mediator(window);
    scorm = new SCORM(mediator);
  });
  describe('__setData', () => {
    it('should set data to the passed in data', () => {
      const testData = {
        test: 'test',
      };
      scorm.__setData(testData);
      expect(scorm.data).toEqual(testData);
    });
    it('should set data to an empty state if no data passed in', () => {
      scorm.__setData();
      expect(scorm.data).toEqual({});
    });
  });
  describe('__setUserData', () => {
    it('should set userData to the passed in data', () => {
      const testData = {
        test: 'test',
      };
      scorm.__setUserData(testData);
      expect(scorm.userData).toEqual(testData);
    });
    it('should set userData to an empty state if no data passed in', () => {
      scorm.__setUserData();
      expect(scorm.userData).toEqual({});
    });
  });
  describe('shim management and instance methods', () => {
    let shim;
    beforeEach(() => {
      shim = scorm.__setShimInterface();
      scorm.stateUpdated = jest.fn();
    });
    describe('__setShimInterface method', () => {
      it('should set scorm shim property', () => {
        expect(scorm.shim).not.toBeUndefined();
      });
    });
    describe('iframeInitialize method', () => {
      it('should set API property on object', () => {
        const obj = {};
        scorm.iframeInitialize(obj);
        expect(obj.API).toEqual(scorm.shim);
      });
    });
    describe('LMSInitialize method', () => {
      it('should return "true"', () => {
        expect(shim.LMSInitialize()).toEqual('true');
      });
      it('should stateUpdated', () => {
        shim.LMSInitialize();
        expect(scorm.stateUpdated).toHaveBeenCalled();
      });
    });
    describe('LMSSetValue and LMSGetValue methods', () => {
      const types = [
        'true-false',
        'choice',
        'fill-in',
        'matching',
        'performance',
        'sequencing',
        'likert',
        'numeric',
      ];
      const results = ['correct', 'wrong', 'unanticipated', 'neutral'];
      const statuses = ['passed', 'completed', 'failed', 'incomplete', 'browsed', 'not attempted'];
      const objectivesValues = flatMap(statuses, (s, i) => [
        ['cmi.objectives.' + i + '.id', `id${i}`],
        ['cmi.objectives.' + i + '.score.raw', 1 + i],
        ['cmi.objectives.' + i + '.score.min', 0],
        ['cmi.objectives.' + i + '.score.max', 10],
        ['cmi.objectives.' + i + '.status', s],
      ]);
      const interactionsValues = flatMap(types, (t, i) => [
        ['cmi.interactions.' + i + '.id', `id${i}`],
      ]);
      const values = [
        ['cmi.core.lesson_location', 'somewhere'],
        ['cmi.core.score.raw', 5],
        ['cmi.core.score.min', 0],
        ['cmi.core.score.max', 10],
        ['cmi.suspend_data', 'suspension'],
        ['cmi.comments', 'learning here'],
        ...statuses.map(status => ['cmi.core.lesson_status', status]),
        ...objectivesValues,
        ...interactionsValues,
      ];
      const writeOnlyInteractionsValues = flatMap(types, (t, i) => [
        ['cmi.interactions.' + i + '.time', '10:57:54'],
        ['cmi.interactions.' + i + '.type', t],
        ['cmi.interactions.' + i + '.weighting', 0.5],
        ['cmi.interactions.' + i + '.student_response', 3],
        ...results.map(r => ['cmi.interactions.' + i + '.result', r]),
        ['cmi.interactions.' + i + '.latency', '9:13:12'],
      ]);
      const notImplementedValues = [
        ['cmi.student_preference.audio', 3],
        ['cmi.student_preference.speed', 1],
        ['cmi.student_preference.text', 1],
      ];
      it.each(values)('should set and get %s properly', (key, value) => {
        shim.LMSSetValue(key, value);
        expect(shim.LMSGetValue(key)).toEqual(value);
      });
      it.each(writeOnlyInteractionsValues)(
        'should set without errors, but not get %s properly for write only properties',
        (key, value) => {
          shim.LMSSetValue(key, value);
          expect(shim.LMSGetLastError()).toEqual(0);
          expect(shim.LMSGetValue(key)).toEqual('');
          expect(shim.LMSGetLastError()).toEqual('404');
        },
      );
      it.each(notImplementedValues)(
        'should set with errors, and get %s with errors for not implemented properties',
        (key, value) => {
          shim.LMSSetValue(key, value);
          expect(shim.LMSGetLastError()).toEqual('401');
          expect(shim.LMSGetValue(key)).toEqual('');
          expect(shim.LMSGetLastError()).toEqual('401');
        },
      );
      it('should read language from the userData', () => {
        const language = 'fr-fr';
        scorm.userData.language = language;
        expect(shim.LMSGetValue('cmi.student_preference.language')).toEqual(language);
      });
      it('should count interactions properly', () => {
        interactionsValues.forEach(([k, v]) => shim.LMSSetValue(k, v));
        expect(shim.LMSGetValue('cmi.interactions._count')).toEqual(interactionsValues.length);
      });
      it('should count objectives properly', () => {
        statuses.map((s, i) => shim.LMSSetValue('cmi.objectives.' + i + '.id', `id${s}`));
        expect(shim.LMSGetValue('cmi.objectives._count')).toEqual(statuses.length);
      });
      it('should count objectives in an interaction properly', () => {
        shim.LMSSetValue('cmi.interactions.0.id', 'test');
        statuses.map((s, i) =>
          shim.LMSSetValue('cmi.interactions.0.objectives.' + i + '.id', `id${s}`),
        );
        expect(shim.LMSGetValue('cmi.interactions.0.objectives._count')).toEqual(statuses.length);
      });
    });
  });
});
