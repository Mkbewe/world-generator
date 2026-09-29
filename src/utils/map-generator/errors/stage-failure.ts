/** One entry-level failure a stage reports, independent of the domain type. */
export interface StageFailure {
  /** Stable id of the offending entry, e.g. a geological area id. */
  readonly id: string;
  readonly message: string;
}

/** Failures a thrown error carries, or an empty list for unrelated errors. */
export function stageFailures(error: unknown): readonly StageFailure[] {
  if (!(error instanceof Error) || !('failures' in error)) {
    return [];
  }
  const failures: unknown = (error as { failures?: unknown }).failures;
  if (!Array.isArray(failures)) {
    return [];
  }
  return failures.filter(isStageFailure);
}

function isStageFailure(value: unknown): value is StageFailure {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string' && typeof record.message === 'string';
}
