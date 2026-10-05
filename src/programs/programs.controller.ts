import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Paginated } from '../common/dto/pagination-query.dto';
import { Role } from '../common/enums/role.enum';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { CreateProgramDto, ProgramsQueryDto, UpdateProgramDto } from './dto/program.dto';
import { ProgramsService } from './programs.service';
import { Program } from './schemas/program.schema';

@ApiTags('programs')
@ApiBearerAuth()
@Controller('programs')
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @ApiOperation({ summary: 'Crear un programa' })
  @Roles(Role.Admin)
  @Post()
  create(@Body() dto: CreateProgramDto): Promise<Program> {
    return this.programsService.create(dto);
  }

  @ApiOperation({ summary: 'Listar programas (filtros: q, faculty, active)' })
  @Roles(Role.Admin, Role.Docente, Role.Estudiante)
  @Get()
  findAll(@Query() query: ProgramsQueryDto): Promise<Paginated<Program>> {
    return this.programsService.findAll(query);
  }

  @ApiOperation({ summary: 'Ver un programa por ID' })
  @Roles(Role.Admin, Role.Docente, Role.Estudiante)
  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: string): Promise<Program> {
    return this.programsService.findOne(id);
  }

  @ApiOperation({ summary: 'Editar un programa' })
  @Roles(Role.Admin)
  @Patch(':id')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateProgramDto,
  ): Promise<Program> {
    return this.programsService.update(id, dto);
  }
}
