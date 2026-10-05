import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Enrollment, EnrollmentSchema } from '../enrollments/schemas/enrollment.schema';
import { ProgramsModule } from '../programs/programs.module';
import { UsersModule } from '../users/users.module';
import { Student, StudentSchema } from './schemas/student.schema';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Student.name, schema: StudentSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
    ]),
    UsersModule,
    ProgramsModule,
  ],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
