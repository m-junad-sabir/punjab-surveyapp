import { Repository, DataSource } from 'typeorm';
import { IndustrialUnit } from '../../dal/entities/industrial-unit.entity';
export interface ApproveRejectDto {
    response_id?: string;
    remarks?: string;
}
export declare class IndustrialUnitService {
    private readonly unitRepo;
    private readonly dataSource;
    constructor(unitRepo: Repository<IndustrialUnit>, dataSource: DataSource);
    findAll(): Promise<IndustrialUnit[]>;
    findOne(unitId: string): Promise<IndustrialUnit>;
    approveUnit(unitId: string, supervisorId: string, dto?: ApproveRejectDto): Promise<{
        message: string;
    }>;
    rejectUnit(unitId: string, supervisorId: string, dto?: ApproveRejectDto): Promise<{
        message: string;
    }>;
}
