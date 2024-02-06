import { ServiceError } from "@cronitio/pylon";

export class NotFoundError extends ServiceError {
  constructor(message: string = "Object not found") {
    super(message, {
      code: "OBJECT_NOT_FOUND",
      statusCode: 404,
      message,
    });
  }
}

export class CreateError extends ServiceError {
  constructor(message: string = "Error creating object") {
    super(message, {
      code: "CREATE_ERROR",
      statusCode: 500,
      message,
    });
  }
}

export class UpdateError extends ServiceError {
  constructor(message: string = "Error updating object") {
    super(message, {
      code: "UPDATE_ERROR",
      statusCode: 500,
      message,
    });
  }
}

export class DeleteError extends ServiceError {
  constructor(message: string = "Error deleting object") {
    super(message, {
      code: "DELETE_ERROR",
      statusCode: 500,
      message,
    });
  }
}

export class UpsertError extends ServiceError {
  constructor(message: string = "Error upserting object") {
    super(message, {
      code: "UPSERT_ERROR",
      statusCode: 500,
      message,
    });
  }
}

export class InvalidInputError extends ServiceError {
  constructor(message: string = "Invalid input") {
    super(message, {
      code: "INVALID_INPUT",
      statusCode: 400,
      message,
    });
  }
}
