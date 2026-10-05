import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupsModule } from '../groups/groups.module';
import { Group, GroupSchema } from '../groups/schemas/group.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { Period, PeriodSchema } from '../periods/schemas/period.schema';
import { PeriodsModule } from '../periods/periods.module';
import { StudentsModule } from '../students/students.module';
import { SubjectsModule } from '../subjects/subjects.module';
import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';
import { Enrollment, EnrollmentSchema } from './schemas/enrollment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: Group.name, schema: GroupSchema },
      { name: Period.name, schema: PeriodSchema },
    ]),
    StudentsModule,
    NotificationsModule,
    GroupsModule,
    SubjectsModule,
    PeriodsModule,
  ],
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService, MongooseModule],
})
export class EnrollmentsModule {}
