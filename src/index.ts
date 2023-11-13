type ExcludeProperties<T, K extends keyof T> = Omit<T, K>;

type StaticMethods<T> = Omit<
  {
    [K in keyof T]: T[K] extends (...args: any[]) => any
      ? K extends "prototype"
        ? never
        : T[K]
      : T[K];
  },
  "prototype"
>;

export const shadowCls = <
  ExcludeKeys extends keyof InstanceType<T>,
  T extends new (...args: any) => Record<string, any> = new (
    ...args: any
  ) => Record<string, any>
>(
  Cls: T,
  excludeKeys: ExcludeKeys[]
) => {
  // Create a new type definition based on the excluded properties
  type ShadowedInstance = ExcludeProperties<InstanceType<T>, ExcludeKeys>;

  // Create a new type definition based on the original class and the new type definition
  type ShadowedClass = (new (
    ...args: ConstructorParameters<T>
  ) => ShadowedInstance) &
    StaticMethods<T>;

  // Create a new class that extends the original class
  const ShadowedCls = class extends Cls {
    constructor(...args: any[]) {
      super(...args);

      // Exclude the properties from the instance
      excludeKeys.forEach((key) => {
        delete (this as any)[key];
      });
    }
  } as unknown as ShadowedClass;

  return ShadowedCls;
};
