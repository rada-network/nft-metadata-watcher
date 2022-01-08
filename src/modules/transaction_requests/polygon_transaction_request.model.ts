import { Entity, OneToOne } from 'typeorm';
import { OpenBox } from '../open_box/open_box.model';
import { BaseTransactionRequest } from './base_transaction_request.model';

@Entity()
export class PolygonTransactionRequest extends BaseTransactionRequest {
  @OneToOne((type) => OpenBox, (e) => e.randomTransactionRequest)
  readonly openBox: OpenBox | null;
}
