import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { IndustrialUnit } from '../../dal/entities/industrial-unit.entity';

export interface ApproveRejectDto {
  response_id?: string;
  remarks?: string;
}

@Injectable()
export class IndustrialUnitService {
  constructor(
    @InjectRepository(IndustrialUnit)
    private readonly unitRepo: Repository<IndustrialUnit>,

    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async findAll(): Promise<IndustrialUnit[]> {
    return this.unitRepo.find({ order: { created_at: 'DESC' } });
  }

  async findOne(unitId: string): Promise<IndustrialUnit> {
    const unit = await this.unitRepo.findOne({ where: { id: unitId } });
    if (!unit) throw new NotFoundException(`Industrial unit ${unitId} not found`);
    return unit;
  }

  async approveUnit(
    unitId: string,
    supervisorId: string,
    dto: ApproveRejectDto = {},
  ): Promise<{ message: string }> {
    const unit = await this.findOne(unitId);

    await this.unitRepo.update(unitId, { approval_status: 'CONFIRMED' });

    await this.dataSource.query(
      `INSERT INTO unit_approval_log (unit_id, action, acted_by, response_id, remarks, acted_at)
       VALUES ($1, 'CONFIRMED', $2, $3, $4, NOW())`,
      [unitId, supervisorId, dto.response_id ?? null, dto.remarks ?? null],
    );

    if (dto.response_id) {
      await this.dataSource.query(
        `UPDATE survey_responses SET status = 'CONFIRMED', confirmed_by = $1, confirmed_at = NOW()
          WHERE id = $2`,
        [supervisorId, dto.response_id],
      );
    }

    return { message: `Unit "${unit.name}" approved.` };
  }

  async rejectUnit(
    unitId: string,
    supervisorId: string,
    dto: ApproveRejectDto = {},
  ): Promise<{ message: string }> {
    const unit = await this.findOne(unitId);

    await this.unitRepo.update(unitId, { approval_status: 'REJECTED' });

    await this.dataSource.query(
      `INSERT INTO unit_approval_log (unit_id, action, acted_by, response_id, remarks, acted_at)
       VALUES ($1, 'REJECTED', $2, $3, $4, NOW())`,
      [unitId, supervisorId, dto.response_id ?? null, dto.remarks ?? null],
    );

    if (dto.response_id) {
      await this.dataSource.query(
        `UPDATE survey_responses SET status = 'REJECTED', confirmed_by = $1, confirmed_at = NOW()
          WHERE id = $2`,
        [supervisorId, dto.response_id],
      );
    }

    return { message: `Unit "${unit.name}" rejected.` };
  }
}
