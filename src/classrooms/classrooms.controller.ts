import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Paginated } from '../common/dto/pagination-query.dto';
import { Role } from '../common/enums/role.enum';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { ClassroomsService } from './classrooms.service';
import { ClassroomsQueryDto, CreateClassroomDto, UpdateClassroomDto } from './dto/classroom.dto';
import { Classroom } from './schemas/classroom.schema';

@ApiTags('classrooms')
@ApiBearerAuth()
@Controller('classrooms')
export class ClassroomsController {
  constructor(private readonly classroomsService: ClassroomsService) {}

  @ApiOperation({ summary: 'Crear un salon' })
  @Roles(Role.Admin)
  @Post()
  create(@Body() dto: CreateClassroomDto): Promise<Classroom> {
    return this.classroomsService.create(dto);
  }

  @ApiOperation({ summary: 'Listar salones' })
  @Roles(Role.Admin, Role.Docente, Role.Estudiante)
  @Get()
  findAll(@Query() query: ClassroomsQueryDto): Promise<Paginated<Classroom>> {
    return this.classroomsService.findAll(query);
  }

  @ApiOperation({ summary: 'Ver un salon por ID' })
  @Roles(Role.Admin, Role.Docente, Role.Estudiante)
  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: string): Promise<Classroom> {
    return this.classroomsService.findOne(id);
  }

  @ApiOperation({ summary: 'Editar un salon' })
  @Roles(Role.Admin)
  @Patch(':id')
  update(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateClassroomDto): Promise<Classroom> {
    return this.classroomsService.update(id, dto);
  }
}
