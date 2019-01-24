export function canViewExam(exam, examLog) {
  return exam.active && !examLog.closed;
}

export function canViewExamReport(exam, examLog) {
  return !canViewExam(exam, examLog);
}
