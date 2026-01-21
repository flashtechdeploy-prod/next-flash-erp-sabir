import { ApiProperty } from '@nestjs/swagger';

export class ImportCsvDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file!: any;
}
