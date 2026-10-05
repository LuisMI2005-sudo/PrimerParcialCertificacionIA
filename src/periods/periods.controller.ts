import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Paginated } from '../common/dto/pagination-query.dto';
import { Role } from '../common/enums/role.enum';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { ClosePeriodQueryDto, CreatePeriodDto, PeriodsQueryDto, UpdatePeriodDto } from './dto/period.dto';
import { CloseCheck, PeriodsService } from './periods.service';
import { Period } from './schemas/period.schema';

@ApiTags('periods')
@ApiBearerAuth()
@Controller('periods')
export class PeriodsController {
  constructor(private readonly periodsService: PeriodsService) {}

  @ApiOperation({ summary: 'Crear un periodo' })
  @Roles(Role.Admin)
  @Post()
  create(@Body() dto: CreatePeriodDto): Promise<Period> {
    return this.periodsService.create(dto);
  }

  @ApiOperation({ summary: 'Listar periodos (filtro: status)' })
  @Roles(Role.Admin, Role.Docente, Role.Estudiante)
  @Get()
  findAll(@Query() query: PeriodsQueryDto): Promise<Paginated<Period>> {
    return this.periodsService.findAll(query);
  }

  // Debe ir antes de ':id' para que 'current' no se interprete como un ID
  @ApiOperation({ summary: 'Periodo abierto actual' })
  @Get('current')
  current(): Promise<Period> {
    return this.periodsService.findCurrent();
  }

  @ApiOperation({ summary: 'Ver un periodo por ID' })
  @Roles(Role.Admin, Role.Docente, Role.Estudiante)
  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: string): Promise<Period> {
    return this.periodsService.findOne(id);
  }

  @ApiOperation({ summary: 'Revision previa al cierre: matriculas activas pendientes por grupo' })
  @Roles(Role.Admin)
  @Get(':id/close-check')
  closeCheck(@Param('id', ParseObjectIdPipe) id: string): Promise<CloseCheck> {
    return this.periodsService.closeCheck(id);
  }

  @ApiOperation({ summary: 'Cierra el periodo (abierto -> cerrado). Es irreversible' })
  @Roles(Role.Admin)
  @Post(':id/close')
  @HttpCode(200)
  close(@Param('id', ParseObjectIdPipe) id: string, @Query() query: ClosePeriodQueryDto): Promise<Record<string, unknown>> {
    return this.periodsService.close(id, query.cancelPending ?? false);
  }

  @ApiOperation({ summary: 'Editar un periodo' })
  @Roles(Role.Admin)
  @Patch(':id')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdatePeriodDto,
  ): Promise<Period> {
    return this.periodsService.update(id, dto);
  }
}
