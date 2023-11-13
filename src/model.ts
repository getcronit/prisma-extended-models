export abstract class Model {
  $save() {}
  $fetch() {}

  constructor() {}

  $boostrap(that: any, fields: any, hiddenFields: string[]) {
    for (const [key, value] of Object.entries(fields)) {
      const keyName = hiddenFields.includes(key) ? "$" + key : key;

      that[keyName as keyof this] = value as any;
    }
  }
}
