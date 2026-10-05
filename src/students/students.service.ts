import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Paginated, paginate } from '../common/dto/pagination-query.dto';
import { textPattern } from '../common/dto/query-helpers';
import { Role } from '../common/enums/role.enum';
import { Enrollment, EnrollmentDocument } from '../enrollments/schemas/enrollment.schema';
import { ProgramsService } from '../programs/programs.service';
import { UsersService } from '../users/users.service';
import { CreateStudentDto, StudentsQueryDto, UpdateStudentDto } from './dto/student.dto';
import { Student, StudentDocument } from './schemas/student.schema';

@Injectable()
export class StudentsService {
  constructor(
    @InjectModel(Student.name) private readonly model: Model<StudentDocument>,
    @InjectModel(Enrollment.name) private readonly enrollmentModel: Model<EnrollmentDocument>,
    private readonly usersService: UsersService,
    private readonly programsService: ProgramsService,
  ) {}

  async create(dto: CreateStudentDto): Promise<StudentDocument> {
    const user = await this.usersService.findById(dto.user);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.role !== Role.Estudiante) {
      throw new BadRequestException('El usuario no tiene rol estudiante');
    }
    await this.programsService.findOne(dto.program);
    return this.model.create(dto);
  }

  async findAll(query: StudentsQueryDto): Promise<Paginated<Student>> {
    const filter: FilterQuery<StudentDocument> = {};
    if (query.program) filter.program = query.program;
    if (query.active !== undefined) filter.active = query.active;
    if (query.q) {
      // El nombre y el correo viven en 'users': se buscan ahi y se cruzan por el ID del usuario
      const userIds = await this.usersService.findIdsByText(query.q, Role.Estudiante);
      filter.$or = [{ code: textPattern(query.q) }, { user: { $in: userIds } }];
    }

    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .populate('user', 'name email')
        .populate('program', 'code name')
        .sort({ code: 1 })
        .skip(query.skip)
        .limit(query.limit)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return paginate(data, total, query);
  }

  async findOne(id: string): Promise<StudentDocument> {
    const student = await this.model
      .findById(id)
      .populate('user', 'name email')
      .populate('program', 'code name')
      .exec();
    if (!student) throw new NotFoundException('Estudiante no encontrado');
    return student;
  }

  // Perfil del estudiante a partir de su usuario autenticado
  async findByUserId(userId: string): Promise<StudentDocument> {
    const student = await this.model
      .findOne({ user: userId })
      .populate('user', 'name email')
      .populate('program', 'code name')
      .exec();
    if (!student) throw new NotFoundException('El usuario no tiene perfil de estudiante');
    return student;
  }

  async update(id: string, dto: UpdateStudentDto): Promise<StudentDocument> {
    if (dto.program) await this.programsService.findOne(dto.program);
    if (dto.program) {
      const student = await this.model.findById(id).select('program').exec();
      if (!student) throw new NotFoundException('Estudiante no encontrado');
      if (String(student.program) !== dto.program && await this.enrollmentModel.exists({ student: student._id })) {
        throw new BadRequestException('No se puede cambiar el programa de un estudiante con matriculas registradas');
      }
    }
    const student = await this.model
      .findByIdAndUpdate(id, dto, { new: true, runValidators: true })
      .exec();
    if (!student) throw new NotFoundException('Estudiante no encontrado');
    return student;
  }
}
