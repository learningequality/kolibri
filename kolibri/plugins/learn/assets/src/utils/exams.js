export function canViewExam(exam, masteryLog) {
  return exam.active && !masteryLog.complete;
}

export function canViewExamReport(exam, masteryLog) {
  return !canViewExam(exam, masteryLog);
}
