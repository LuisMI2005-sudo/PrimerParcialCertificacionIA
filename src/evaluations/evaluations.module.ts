import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupsModule } from '../groups/groups.module';
import { Grade, GradeSchema } from '../grades/schemas/grade.schema';
import { Group, GroupSchema } from '../groups/schemas/group.schema';
import { PeriodsModule } from '../periods/periods.module';
import { EvaluationsController } from './evaluations.controller';
import { EvaluationsService } from './evaluations.service';
import { Evaluation, EvaluationSchema } from './schemas/evaluation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Evaluation.name, schema: EvaluationSchema },
      { name: Grade.name, schema: GradeSchema },
      { name: Group.name, schema: GroupSchema },
    ]),
    GroupsModule,
    PeriodsModule,
  ],
  controllers: [EvaluationsController],
  providers: [EvaluationsService],
  exports: [EvaluationsService, MongooseModule],
})
export class EvaluationsModule {}
