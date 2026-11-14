export interface FormLink<TData, TActions = Record<string, never>> {
  readonly data: TData;
  readonly actions: TActions;
}
