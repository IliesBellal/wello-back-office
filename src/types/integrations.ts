export type IntegrationKey = 'uberEats' | 'deliveroo';

export interface IntegrationActivationStatus {
  active: boolean;
  reason: 'configured' | 'missing_config';
}

export type IntegrationStatusMap = Record<IntegrationKey, IntegrationActivationStatus>;
