import { Resource } from 'kolibri.lib.apiResource';

class LessonReportResource extends Resource {
  static resourceName() {
    return 'kolibri:coach:lessonreport';
  }
}

export default new LessonReportResource();
