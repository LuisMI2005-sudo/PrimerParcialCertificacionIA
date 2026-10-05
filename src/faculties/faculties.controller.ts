import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Paginated } from '../common/dto/pagination-query.dto';
import { Role } from '../common/enums/role.enum';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { CreateFacultyDto, FacultiesQueryDto, UpdateFacultyDto } from './dto/faculty.dto';
import { FacultiesService } from './faculties.service';
import { Faculty } from './schemas/faculty.schema';

@ApiTags('faculties')
@ApiBearerAuth()
@Controller('faculties')
export class FacultiesController {
  constructor(private readonly facultiesService: FacultiesService) {}

  @ApiOperation({ summary: 'Crear una facultad' })
  @Roles(Role.Admin)
  @Post()
  create(@Body() dto: CreateFacultyDto): Promise<Faculty> {
    return this.facultiesService.create(dto);
  }

  @ApiOperation({ summary: 'Listar facultades' })
  @Roles(Role.Admin, Role.Docente, Role.Estudiante)
  @Get()
  findAll(@Query() query: FacultiesQueryDto): Promise<Paginated<Faculty>> {
    return this.facultiesService.findAll(query);
  }

  @ApiOperation({ summary: 'Ver una facultad por ID' })
  @Roles(Role.Admin, Role.Docente, Role.Estudiante)
  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: string): Promise<Faculty> {
    return this.facultiesService.findOne(id);
  }

  @ApiOperation({ summary: 'Editar una facultad' })
  @Roles(Role.Admin)
  @Patch(':id')
  update(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateFacultyDto): Promise<Faculty> {
    return this.facultiesService.update(id, dto);
  }
}
