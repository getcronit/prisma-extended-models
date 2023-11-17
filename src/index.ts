export { shadowCls } from "./shadow-cls.js";
export { ObjectManager } from "./object-manager.js";
export { Model } from "./model.js";
export {
  NotFoundError,
  CreateError,
  UpdateError,
  DeleteError,
  UpsertError,
  InvalidInputError,
} from "./errors.js";

export type Nullable<T> = T | null;

export type MakeNullable<T> = T extends Promise<infer U>
  ? Promise<Nullable<U>>
  : Nullable<T>;

export type NullableGetFunction<T extends (...args: any[]) => any> = (
  where: Parameters<T>[0],
  orderBy: Parameters<T>[1]
) => MakeNullable<ReturnType<T>>;

export type NullablePaginateFunction<T extends (...args: any[]) => any> = (
  pagination: Parameters<T>[0],
  where: Parameters<T>[1],
  orderBy: Parameters<T>[2]
) => MakeNullable<ReturnType<T>>;
