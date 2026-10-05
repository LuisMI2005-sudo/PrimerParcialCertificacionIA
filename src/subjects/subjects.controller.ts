import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Paginated } from '../common/dto/pagination-query.dto';
import { Role } from '../common/enums/role.enum';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { CreateSubjectDto, SubjectsQueryDto, UpdateSubjectDto } from './dto/subject.dto';
import { Subject } from './schemas/subject.schema';
import { SubjectsService } from './subjects.service';

@ApiTags('subjects')
@ApiBearerAuth()
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @ApiOperation({ summary: 'Crear una materia' })
  @Roles(Role.Admin)
  @Post()
  create(@Body() dto: CreateSubjectDto): Promise<Subject> {
    return this.subjectsService.create(dto);
  }

  @ApiOperation({ summary: 'Listar materias (filtros: q, program, semester, active)' })
  @Roles(Role.Admin, Role.Docente, Role.Estudiante)
  @Get()
  findAll(@Query() query: SubjectsQueryDto): Promise<Paginated<Subject>> {
    return this.subjectsService.findAll(query);
  }

  @ApiOperation({ summary: 'Ver una materia por ID' })
  @Roles(Role.Admin, Role.Docente, Role.Estudiante)
  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: string): Promise<Subject> {
    return this.subjectsService.findOne(id);
  }

  @ApiOperation({ summary: 'Editar una materia' })
  @Roles(Role.Admin)
  @Patch(':id')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateSubjectDto,
  ): Promise<Subject> {
    return this.subjectsService.update(id, dto);
  }
}
