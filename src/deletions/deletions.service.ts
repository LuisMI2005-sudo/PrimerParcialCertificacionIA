import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { Classroom, ClassroomDocument } from '../classrooms/schemas/classroom.schema';
import { Enrollment, EnrollmentDocument, EnrollmentStatus } from '../enrollments/schemas/enrollment.schema';
import { Evaluation, EvaluationDocument } from '../evaluations/schemas/evaluation.schema';
import { Faculty, FacultyDocument } from '../faculties/schemas/faculty.schema';
import { Grade, GradeDocument } from '../grades/schemas/grade.schema';
import { GroupsService } from '../groups/groups.service';
import { Group, GroupDocument } from '../groups/schemas/group.schema';
import { Notification, NotificationDocument } from '../notifications/schemas/notification.schema';
import { Period, PeriodDocument, PeriodStatus } from '../periods/schemas/period.schema';
import { Program, ProgramDocument } from '../programs/schemas/program.schema';
import { Student, StudentDocument } from '../students/schemas/student.schema';
import { Subject, SubjectDocument } from '../subjects/schemas/subject.schema';
import { Teacher, TeacherDocument } from '../teachers/schemas/teacher.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

export interface Deleted {
  deleted: true;
  resource: string;
  id: string;
}

// Un registro NO se elimina si otros registros dependen de el: asi no quedan referencias rotas.
// Para "apagar" algo sin borrarlo, cada recurso tiene su campo 'active' (PATCH).
@Injectable()
export class DeletionsService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<GroupDocument>,
    @InjectModel(Enrollment.name) private readonly enrollmentModel: Model<EnrollmentDocument>,
    @InjectModel(Evaluation.name) private readonly evaluationModel: Model<EvaluationDocument>,
    @InjectModel(Grade.name) private readonly gradeModel: Model<GradeDocument>,
    @InjectModel(Notification.name) private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(Classroom.name) private readonly classroomModel: Model<ClassroomDocument>,
    @InjectModel(Faculty.name) private readonly facultyModel: Model<FacultyDocument>,
    @InjectModel(Program.name) private readonly programModel: Model<ProgramDocument>,
    @InjectModel(Subject.name) private readonly subjectModel: Model<SubjectDocument>,
    @InjectModel(Period.name) private readonly periodModel: Model<PeriodDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Student.name) private readonly studentModel: Model<StudentDocument>,
    @InjectModel(Teacher.name) private readonly teacherModel: Model<TeacherDocument>,
    private readonly groupsService: GroupsService,
  ) {}

  async removeGroup(id: string): Promise<Deleted> {
    await this.mustExist(this.groupModel, id, 'Grupo');
    await this.assertUnused('el grupo', [
      [this.enrollmentModel.countDocuments({ group: id }), 'matriculas'],
      [this.evaluationModel.countDocuments({ group: id }), 'evaluaciones'],
    ]);
    await this.notificationModel.deleteMany({ relatedModel: 'Group', relatedId: id });
    await this.groupModel.deleteOne({ _id: id });
    return this.done('groups', id);
  }

  // El docente solo borra evaluaciones de sus grupos
  async removeEvaluation(id: string, user: AuthUser): Promise<Deleted> {
    const evaluation = await this.mustExist<EvaluationDocument>(this.evaluationModel, id, 'Evaluacion');
    await this.groupsService.assertCanManage(String(evaluation.group), user);
    await this.assertUnused('la evaluacion', [[this.gradeModel.countDocuments({ evaluation: id }), 'notas registradas']]);
    await this.evaluationModel.deleteOne({ _id: id });
    return this.done('evaluations', id);
  }

  // Corregir una nota puesta por error: solo mientras la matricula siga activa
  async removeGrade(id: string, user: AuthUser): Promise<Deleted> {
    const grade = await this.mustExist<GradeDocument>(this.gradeModel, id, 'Nota');
    const enrollment = await this.mustExist<EnrollmentDocument>(this.enrollmentModel, String(grade.enrollment), 'Matricula');
    await this.groupsService.assertCanManage(String(enrollment.group), user);
    if (enrollment.status !== EnrollmentStatus.Active) {
      throw new ConflictException('No se puede eliminar una nota de una matricula ya finalizada o cancelada');
    }
    await this.gradeModel.deleteOne({ _id: id });
    return this.done('grades', id);
  }

  async removeNotification(id: string, userId: string): Promise<Deleted> {
    const notification = await this.mustExist<NotificationDocument>(this.notificationModel, id, 'Notificacion');
    if (String(notification.user) !== userId) throw new ForbiddenException('Esta notificacion no es tuya');
    await this.notificationModel.deleteOne({ _id: id });
    return this.done('notifications', id);
  }

  async removeClassroom(id: string): Promise<Deleted> {
    await this.mustExist(this.classroomModel, id, 'Salon');
    await this.assertUnused('el salon', [[this.groupModel.countDocuments({ 'schedule.classroom': id }), 'grupos con clase en el']]);
    await this.classroomModel.deleteOne({ _id: id });
    return this.done('classrooms', id);
  }

  async removeFaculty(id: string): Promise<Deleted> {
    await this.mustExist(this.facultyModel, id, 'Facultad');
    await this.assertUnused('la facultad', [
      [this.programModel.countDocuments({ faculty: id }), 'programas'],
      [this.teacherModel.countDocuments({ faculty: id }), 'docentes'],
    ]);
    await this.facultyModel.deleteOne({ _id: id });
    return this.done('faculties', id);
  }

  async removeProgram(id: string): Promise<Deleted> {
    await this.mustExist(this.programModel, id, 'Programa');
    await this.assertUnused('el programa', [
      [this.subjectModel.countDocuments({ program: id }), 'materias'],
      [this.studentModel.countDocuments({ program: id }), 'estudiantes'],
    ]);
    await this.programModel.deleteOne({ _id: id });
    return this.done('programs', id);
  }

  async removeSubject(id: string): Promise<Deleted> {
    await this.mustExist(this.subjectModel, id, 'Materia');
    await this.assertUnused('la materia', [
      [this.groupModel.countDocuments({ subject: id }), 'grupos'],
      [this.enrollmentModel.countDocuments({ subject: id }), 'matriculas'],
      [this.subjectModel.countDocuments({ prerequisites: id }), 'materias que la tienen como prerrequisito'],
    ]);
    await this.subjectModel.deleteOne({ _id: id });
    return this.done('subjects', id);
  }

  // Solo periodos que nunca arrancaron
  async removePeriod(id: string): Promise<Deleted> {
    const period = await this.mustExist<PeriodDocument>(this.periodModel, id, 'Periodo');
    if (period.status !== PeriodStatus.Planned) {
      throw new ConflictException(`Solo se pueden eliminar periodos planificados (este esta ${period.status})`);
    }
    await this.assertUnused('el periodo', [
      [this.groupModel.countDocuments({ period: id }), 'grupos'],
      [this.enrollmentModel.countDocuments({ period: id }), 'matriculas'],
    ]);
    await this.periodModel.deleteOne({ _id: id });
    return this.done('periods', id);
  }

  async removeStudent(id: string): Promise<Deleted> {
    await this.mustExist(this.studentModel, id, 'Estudiante');
    await this.assertUnused('el estudiante', [[this.enrollmentModel.countDocuments({ student: id }), 'matriculas']]);
    await this.studentModel.deleteOne({ _id: id });
    return this.done('students', id);
  }

  async removeTeacher(id: string): Promise<Deleted> {
    await this.mustExist(this.teacherModel, id, 'Docente');
    await this.assertUnused('el docente', [
      [this.groupModel.countDocuments({ teacher: id }), 'grupos'],
      [this.facultyModel.countDocuments({ dean: id }), 'facultades de las que es decano'],
    ]);
    await this.teacherModel.deleteOne({ _id: id });
    return this.done('teachers', id);
  }

  // Un usuario con perfil (estudiante/docente) no se elimina: primero se elimina el perfil. Sus avisos se borran con el
  async removeUser(id: string, actor: AuthUser): Promise<Deleted> {
    await this.mustExist(this.userModel, id, 'Usuario');
    if (id === actor.id) throw new ConflictException('No puedes eliminar tu propia cuenta');
    await this.assertUnused('el usuario', [
      [this.studentModel.countDocuments({ user: id }), 'perfil de estudiante'],
      [this.teacherModel.countDocuments({ user: id }), 'perfil de docente'],
    ]);
    await this.notificationModel.deleteMany({ user: id });
    await this.userModel.deleteOne({ _id: id });
    return this.done('users', id);
  }

  /* ---------------- utilidades ---------------- */

  private async mustExist<D>(model: { findById(id: string): { exec(): Promise<D | null> } }, id: string, label: string): Promise<D> {
    const doc = await model.findById(id).exec();
    if (!doc) throw new NotFoundException(`${label} no encontrado`);
    return doc;
  }

  // Cuenta las dependencias y, si hay alguna, rechaza con el detalle de cuales
  private async assertUnused(subject: string, checks: [Promise<number>, string][]): Promise<void> {
    const counts = await Promise.all(checks.map(([count]) => count));
    const used = checks.map(([, label], i) => ({ label, count: counts[i] })).filter((c) => c.count > 0);
    if (used.length > 0) {
      const detail = used.map((u) => `${u.count} ${u.label}`).join(', ');
      throw new ConflictException(`No se puede eliminar ${subject}: tiene ${detail}`);
    }
  }

  private done(resource: string, id: string): Deleted {
    return { deleted: true, resource, id };
  }
}
