import type {
  EntityId,
  IsoDateString,
  LivingThesis,
  LivingThesisCatalystStatus,
  LivingThesisConviction,
  LivingThesisLifecycle,
  LivingThesisRiskLevel,
  LivingThesisRiskStatus,
  TickerSymbol
} from '@thesis-investing/core';

export const livingThesesStorageChannels = {
  create: 'living-theses:create',
  getById: 'living-theses:get-by-id',
  list: 'living-theses:list',
  update: 'living-theses:update'
} as const;

export type LivingThesisRiskWriteInput = {
  readonly id?: EntityId;
  readonly title: string;
  readonly detail?: string;
  readonly status: LivingThesisRiskStatus;
  readonly severity: LivingThesisRiskLevel;
};

export type LivingThesisCatalystWriteInput = {
  readonly id?: EntityId;
  readonly title: string;
  readonly detail?: string;
  readonly status: LivingThesisCatalystStatus;
};

export type LivingThesisFieldsInput = {
  readonly ticker?: TickerSymbol;
  readonly entityName: string;
  readonly title: string;
  readonly theme?: string;
  readonly summary: string;
  readonly bullCase?: string;
  readonly bearCase?: string;
  readonly lifecycle: LivingThesisLifecycle;
  readonly conviction: LivingThesisConviction;
  readonly riskLevel: LivingThesisRiskLevel;
  readonly risks: readonly LivingThesisRiskWriteInput[];
  readonly catalysts: readonly LivingThesisCatalystWriteInput[];
  readonly reviewCadenceDays?: number;
  readonly nextReviewAt?: IsoDateString;
};

export type CreateLivingThesisInput = LivingThesisFieldsInput;

export type UpdateLivingThesisInput = LivingThesisFieldsInput & {
  readonly id: EntityId;
};

export type LivingThesisStorageFailureCode =
  | 'conflict'
  | 'duplicate'
  | 'not-found'
  | 'storage'
  | 'validation';

export type LivingThesisStorageResult<T> =
  | {
      readonly ok: true;
      readonly value: T;
    }
  | {
      readonly ok: false;
      readonly code: LivingThesisStorageFailureCode;
      readonly errors: readonly string[];
    };

export type LivingThesesStorageApi = {
  create(
    input: CreateLivingThesisInput
  ): Promise<LivingThesisStorageResult<LivingThesis>>;
  getById(
    id: EntityId
  ): Promise<LivingThesisStorageResult<LivingThesis>>;
  list(): Promise<LivingThesisStorageResult<LivingThesis[]>>;
  update(
    input: UpdateLivingThesisInput,
    expectedVersion: number
  ): Promise<LivingThesisStorageResult<LivingThesis>>;
};
