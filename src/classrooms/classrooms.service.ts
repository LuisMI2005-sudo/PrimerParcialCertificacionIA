import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Paginated, paginate } from '../common/dto/pagination-query.dto';
import { Group, GroupDocument } from '../groups/schemas/group.schema';
import { ClassroomsQueryDto, CreateClassroomDto, UpdateClassroomDto } from './dto/classroom.dto';
import { Classroom, ClassroomDocument } from './schemas/classroom.schema';

@Injectable()
export class ClassroomsService {
  constructor(
    @InjectModel(Classroom.name) private readonly model: Model<ClassroomDocument>,
    @InjectModel(Group.name) private readonly groupModel: Model<GroupDocument>,
  ) {}

  create(dto: CreateClassroomDto): Promise<ClassroomDocument> {
    return this.model.create(dto);
  }

  async findAll(query: ClassroomsQueryDto): Promise<Paginated<Classroom>> {
    const filter: FilterQuery<ClassroomDocument> = {};
    if (query.building) filter.building = query.building.toUpperCase();
    if (query.type) filter.type = query.type;
    if (query.minCapacity) filter.capacity = { $gte: query.minCapacity };

    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ code: 1 }).skip(query.skip).limit(query.limit).exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return paginate(data, total, query);
  }

  async findOne(id: string): Promise<ClassroomDocument> {
    const classroom = await this.model.findById(id).exec();
    if (!classroom) throw new NotFoundException('Salon no encontrado');
    return classroom;
  }

  // Verifica que todos los salones existan y esten activos (los horarios de los grupos los referencian)
  async assertActive(ids: string[]): Promise<ClassroomDocument[]> {
    const unique = [...new Set(ids)];
    const found = await this.model.find({ _id: { $in: unique } }).exec();
    if (found.length !== unique.length) throw new NotFoundException('Salon no encontrado');
    const inactive = found.find((c) => !c.active);
    if (inactive) throw new BadRequestException(`El salon ${inactive.code} esta inactivo`);
    return found;
  }

  async codeOf(id: string): Promise<string> {
    const classroom = await this.model.findById(id).select('code').exec();
    return classroom?.code ?? id;
  }

  async update(id: string, dto: UpdateClassroomDto): Promise<ClassroomDocument> {
    if (dto.capacity !== undefined) {
      const oversizedGroup = await this.groupModel.exists({
        'schedule.classroom': id,
        capacity: { $gt: dto.capacity },
      });
      if (oversizedGroup) {
        throw new BadRequestException('La capacidad no puede ser menor que la de un grupo asignado al salon');
      }
    }
    const classroom = await this.model.findByIdAndUpdate(id, dto, { new: true, runValidators: true }).exec();
    if (!classroom) throw new NotFoundException('Salon no encontrado');
    return classroom;
  }
}
