import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsObject } from 'class-validator';

import { SQL_DIALECTS, type SqlDialect } from '../services/sql-generator.service';

export class GenerateSqlDto {
  @IsIn(SQL_DIALECTS)
  @ApiProperty({ enum: SQL_DIALECTS, default: 'postgresql' })
  dialect: SqlDialect;

  @IsObject()
  @ApiProperty({ description: 'Modelo lógico atual.' })
  model: unknown;
}
