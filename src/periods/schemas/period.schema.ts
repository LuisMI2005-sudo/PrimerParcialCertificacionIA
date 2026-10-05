import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PeriodDocument = HydratedDocument<Period>;

export enum PeriodStatus {
  Planned = 'planificado',
  Open = 'abierto',
  Closed = 'cerrado',
}

@Schema({ timestamps: true })
export class Period {
  @Prop({ required: true, unique: true, trim: true })
  code!: string;

  @Prop({ required: true })
  startDate!: Date;

  @Prop({ required: true })
  endDate!: Date;

  @Prop({ required: true, enum: PeriodStatus, default: PeriodStatus.Planned })
  status!: PeriodStatus;
}

export const PeriodSchema = SchemaFactory.createForClass(Period);
// La regla de un unico periodo abierto debe mantenerse incluso ante escrituras concurrentes.
PeriodSchema.index({ status: 1 }, { unique: true, partialFilterExpression: { status: PeriodStatus.Open } });
