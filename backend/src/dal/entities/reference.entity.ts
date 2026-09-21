import { Column, Entity, PrimaryColumn } from 'typeorm';

export abstract class NamedReference {
  @PrimaryColumn()
  id: number;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 50, unique: true })
  code: string;
}

@Entity({ name: 'districts' })
export class District extends NamedReference {
  @Column()
  division_id: number;
}

@Entity({ name: 'tehsils' })
export class Tehsil extends NamedReference {
  @Column()
  district_id: number;

  @Column({ length: 20, nullable: true })
  urban_rural: string;
}

@Entity({ name: 'sectors' })
export class Sector extends NamedReference {
  @Column({ nullable: true })
  parent_sector_id: number;
}

@Entity({ name: 'industrial_estates' })
export class IndustrialEstate extends NamedReference {
  @Column({ length: 60, nullable: true })
  estate_type: string;

  @Column({ nullable: true })
  district_id: number;
}
