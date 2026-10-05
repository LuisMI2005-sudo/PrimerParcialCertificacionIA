import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Paginated, paginate } from '../common/dto/pagination-query.dto';
import { textPattern } from '../common/dto/query-helpers';
import { Role } from '../common/enums/role.enum';
import { Faculty, FacultyDocument } from '../faculties/schemas/faculty.schema';
import { UsersService } from '../users/users.service';
import { CreateTeacherDto, TeachersQueryDto, UpdateTeacherDto } from './dto/teacher.dto';
import { Teacher, TeacherDocument } from './schemas/teacher.schema';

@Injectable()
export class TeachersService {
  constructor(
    @InjectModel(Teacher.name) private readonly model: Model<TeacherDocument>,
    // Se inyecta el modelo (no FacultiesService) para no crear un ciclo de modulos Teachers <-> Faculties
    @InjectModel(Faculty.name) private readonly facultyModel: Model<FacultyDocument>,
    private readonly usersService: UsersService,
  ) {}

  async create(dto: CreateTeacherDto): Promise<TeacherDocument> {
    const user = await this.usersService.findById(dto.user);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.role !== Role.Docente) {
      throw new BadRequestException('El usuario no tiene rol docente');
    }
    await this.assertFaculty(dto.faculty);
    return this.model.create(dto);
  }

  async findAll(query: TeachersQueryDto): Promise<Paginated<Teacher>> {
    const filter: FilterQuery<TeacherDocument> = {};
    if (query.faculty) filter.faculty = query.faculty;
    if (query.active !== undefined) filter.active = query.active;
    if (query.q) {
      const userIds = await this.usersService.findIdsByText(query.q, Role.Docente);
      filter.$or = [{ code: textPattern(query.q) }, { user: { $in: userIds } }];
    }

    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .populate('user', 'name email')
        .populate('faculty', 'code name')
        .sort({ code: 1 })
        .skip(query.skip)
        .limit(query.limit)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return paginate(data, total, query);
  }

  async findOne(id: string): Promise<TeacherDocument> {
    const teacher = await this.model.findById(id).populate('user', 'name email').populate('faculty', 'code name').select('-passwordHash').exec();
    if (!teacher) throw new NotFoundException('Docente no encontrado');
    return teacher;
  }

  async findByUserId(userId: string): Promise<TeacherDocument> {
    const teacher = await this.model
      .findOne({ user: userId })
      .populate('user', 'name email')
      .populate('faculty', 'code name')
      .exec();
    if (!teacher) throw new NotFoundException('El usuario no tiene perfil de docente');
    return teacher;
  }

  async update(id: string, dto: UpdateTeacherDto): Promise<TeacherDocument> {
    if (dto.faculty) await this.assertFaculty(dto.faculty);
    const teacher = await this.model
      .findByIdAndUpdate(id, dto, { new: true, runValidators: true })
      .populate('faculty', 'code name')
      .exec();
    if (!teacher) throw new NotFoundException('Docente no encontrado');
    return teacher;
  }

  private async assertFaculty(facultyId: string): Promise<void> {
    const faculty = await this.facultyModel.findById(facultyId).select('-passwordHash').exec();
    if (!faculty) throw new NotFoundException('Facultad no encontrada');
    if (!faculty.active) throw new BadRequestException('La facultad esta inactiva');
  }
}
