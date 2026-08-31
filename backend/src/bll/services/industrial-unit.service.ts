import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { IndustrialUnit } from '../../dal/entities/industrial-unit.entity';

@Injectable()
export class IndustrialUnitService {
  constructor(
    @InjectRepository(IndustrialUnit)
    private unitRepository: Repository<IndustrialUnit>,
    private entityManager: EntityManager,
  ) {}

  async findAll() {
    return this.unitRepository.find({
      order: { created_at: 'DESC' },
    });
  }

  async findOne(unit_id: string) {
    const unit = await this.unitRepository.findOne({ where: { unit_id } });
    if (!unit) {
      throw new NotFoundException(`Industrial Unit with ID ${unit_id} not found`);
    }
    return unit;
  }

  async approveUnit(unit_id: string, response_id: string, actioned_by: string, remarks?: string) {
    const unit = await this.findOne(unit_id);
    
    await this.entityManager.transaction(async (transactionalEntityManager) => {
      // 1. Update unit status
      unit.is_verified = true;
      unit.operational_status = 'Active';
      unit.verified_by = actioned_by;
      unit.verified_at = new Date();
      await transactionalEntityManager.save(unit);

      // 2. Add approval log
      await transactionalEntityManager.query(
        `INSERT INTO unit_approval_log (unit_id, response_id, action, actioned_by, remarks, actioned_at)
         VALUES ($1, $2, 'approved', $3, $4, NOW())`,
        [unit_id, response_id, actioned_by, remarks || 'Approved by Supervisor'],
      );

      // 3. Mark response as synced/approved (optional check)
      if (response_id) {
        await transactionalEntityManager.query(
          `UPDATE survey_responses SET sync_status = 'synced' WHERE response_id = $1`,
          [response_id],
        );
      }
    });

    return { message: 'Industrial unit successfully verified and approved' };
  }

  async rejectUnit(unit_id: string, response_id: string, actioned_by: string, remarks?: string) {
    const unit = await this.findOne(unit_id);

    await this.entityManager.transaction(async (transactionalEntityManager) => {
      // 1. Update unit status
      unit.is_verified = false;
      unit.operational_status = 'Unverified';
      await transactionalEntityManager.save(unit);

      // 2. Add approval log
      await transactionalEntityManager.query(
        `INSERT INTO unit_approval_log (unit_id, response_id, action, actioned_by, remarks, actioned_at)
         VALUES ($1, $2, 'rejected', $3, $4, NOW())`,
        [unit_id, response_id, actioned_by, remarks || 'Rejected during verification check'],
      );

      // 3. Update response status to rejected
      if (response_id) {
        await transactionalEntityManager.query(
          `UPDATE survey_responses SET sync_status = 'rejected' WHERE response_id = $1`,
          [response_id],
        );
      }
    });

    return { message: 'Industrial unit rejected' };
  }
}
