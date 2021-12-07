from .models import ExamAssignment
from .models import IndividualSyncableExam
from kolibri.core.auth.utils.delete import DisablePostDeleteSignal


def update_individual_syncable_exams_from_assignments(user_id):
    """
    Updates the set of IndividualSyncableExam objects for the user.
    """
    syncableexams = IndividualSyncableExam.objects.filter(user_id=user_id)
    assignments = ExamAssignment.objects.filter(
        collection__membership__user_id=user_id, exam__active=True
    ).distinct()

    # get a list of all active assignments that don't have a syncable exam
    to_create = assignments.exclude(exam_id__in=syncableexams.values_list("exam_id"))

    # get a list of all syncable exams that still have an active assignment
    to_update = syncableexams.filter(exam_id__in=assignments.values_list("exam_id"))

    # get a list of all syncable exams that don't have an active assignment anymore
    to_delete = syncableexams.exclude(exam_id__in=assignments.values_list("exam_id"))

    # create new syncable exam objects for all new assignments
    for assignment in to_create:
        IndividualSyncableExam.objects.create(
            user_id=user_id,
            exam_id=assignment.exam_id,
            serialized_exam=IndividualSyncableExam.serialize_exam(assignment.exam),
            collection=assignment.collection,
        )

    # update existing syncable exam objects for all active assignments
    for syncableexam in to_update:
        assignment = assignments.get(exam_id=syncableexam.exam_id)
        updated_serialization = IndividualSyncableExam.serialize_exam(assignment.exam)
        if (
            syncableexam.serialized_exam != updated_serialization
            or syncableexam.collection_id != assignment.collection_id
        ):
            syncableexam.serialized_exam = updated_serialization
            syncableexam.collection_id = assignment.collection_id
            syncableexam.save()

    # delete syncable exam objects that don't have an active assignment anymore
    to_delete.delete()


def update_assignments_from_individual_syncable_exams(user_id):
    """
    Looks at IndividualSyncableExams for a user and creates/deletes
    the corresponding Exams and ExamAssignments as needed.
    """
    syncableexams = IndividualSyncableExam.objects.filter(user_id=user_id)
    assignments = ExamAssignment.objects.filter(
        collection__membership__user_id=user_id, exam__active=True
    ).distinct()

    # get a list of all syncable exams that aren't locally assigned
    to_create = syncableexams.exclude(exam_id__in=assignments.values_list("exam_id"))

    # get a list of all assignments that may need updating from syncable exams
    to_update = assignments.filter(exam_id__in=syncableexams.values_list("exam_id"))

    # get a list of all active assignments that no longer have a syncable exam
    to_delete = assignments.exclude(exam_id__in=syncableexams.values_list("exam_id"))

    # create new assignments and exams for all new syncable exam objects
    for syncableexam in to_create:

        exam = IndividualSyncableExam.deserialize_exam(syncableexam.serialized_exam)
        exam.collection_id = syncableexam.collection_id
        # shouldn't need to set this field (as it's nullable, according to the model definition, but got errors)
        exam.creator_id = user_id
        exam.save(update_dirty_bit_to=False)

        try:
            ExamAssignment.objects.get(
                collection=syncableexam.collection,
                exam=exam,
            )
        except ExamAssignment.DoesNotExist:
            assignment = ExamAssignment(
                collection=syncableexam.collection,
                exam=exam,
                assigned_by_id=user_id,  # failed validation without this, so pretend it's self-assigned
            )
            assignment.save(update_dirty_bit_to=False)

    # update existing exam/assignment objects for all syncable exams
    for assignment in to_update:
        syncableexam = syncableexams.get(exam_id=assignment.exam_id)
        updated_serialization = IndividualSyncableExam.serialize_exam(assignment.exam)
        if (
            syncableexam.serialized_exam != updated_serialization
            or syncableexam.collection_id != assignment.collection_id
        ):
            exam = IndividualSyncableExam.deserialize_exam(syncableexam.serialized_exam)
            exam.collection_id = syncableexam.collection_id
            exam.creator_id = user_id
            exam.save(update_dirty_bit_to=False)
            assignment.exam = exam
            assignment.collection_id = syncableexam.collection_id
            assignment.save(update_dirty_bit_to=False)

    # delete exams/assignments that no longer have a syncable exam object
    with DisablePostDeleteSignal():
        to_delete.delete()
