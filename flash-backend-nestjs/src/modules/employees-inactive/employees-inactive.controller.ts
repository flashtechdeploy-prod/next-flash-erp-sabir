import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Employees Inactive')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('employees-inactive')
export class EmployeesInactiveController {
  @Get()
  @ApiOperation({ summary: 'List inactive employees' })
  async listInactive(@Query() _query: any) {
    return { employees: [], total: 0 };
  }

  @Post(':employee_id/activate')
  @ApiOperation({ summary: 'Activate an inactive employee' })
  async activate(@Param('employee_id', ParseIntPipe) id: number) {
    return { message: `Employee ${id} activated` };
  }
}
