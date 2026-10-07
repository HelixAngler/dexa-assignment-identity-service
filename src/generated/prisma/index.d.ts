
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model Employee
 * One row per person; doubles as the login identity (unique company email).
 */
export type Employee = $Result.DefaultSelection<Prisma.$EmployeePayload>
/**
 * Model AttendanceSession
 * One working interval per clock-in; `clock_out_at` NULL means the session is open.
 */
export type AttendanceSession = $Result.DefaultSelection<Prisma.$AttendanceSessionPayload>
/**
 * Model ProfileChangeEvent
 * Transactional outbox: written in the same transaction as the profile update.
 */
export type ProfileChangeEvent = $Result.DefaultSelection<Prisma.$ProfileChangeEventPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const EmployeeStatus: {
  active: 'active',
  deactivated: 'deactivated'
};

export type EmployeeStatus = (typeof EmployeeStatus)[keyof typeof EmployeeStatus]


export const EmployeeRole: {
  employee: 'employee',
  hrd: 'hrd'
};

export type EmployeeRole = (typeof EmployeeRole)[keyof typeof EmployeeRole]

}

export type EmployeeStatus = $Enums.EmployeeStatus

export const EmployeeStatus: typeof $Enums.EmployeeStatus

export type EmployeeRole = $Enums.EmployeeRole

export const EmployeeRole: typeof $Enums.EmployeeRole

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Employees
 * const employees = await prisma.employee.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Employees
   * const employees = await prisma.employee.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.employee`: Exposes CRUD operations for the **Employee** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Employees
    * const employees = await prisma.employee.findMany()
    * ```
    */
  get employee(): Prisma.EmployeeDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.attendanceSession`: Exposes CRUD operations for the **AttendanceSession** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AttendanceSessions
    * const attendanceSessions = await prisma.attendanceSession.findMany()
    * ```
    */
  get attendanceSession(): Prisma.AttendanceSessionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.profileChangeEvent`: Exposes CRUD operations for the **ProfileChangeEvent** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ProfileChangeEvents
    * const profileChangeEvents = await prisma.profileChangeEvent.findMany()
    * ```
    */
  get profileChangeEvent(): Prisma.ProfileChangeEventDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.12.0
   * Query Engine version: 8047c96bbd92db98a2abc7c9323ce77c02c89dbc
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    Employee: 'Employee',
    AttendanceSession: 'AttendanceSession',
    ProfileChangeEvent: 'ProfileChangeEvent'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "employee" | "attendanceSession" | "profileChangeEvent"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      Employee: {
        payload: Prisma.$EmployeePayload<ExtArgs>
        fields: Prisma.EmployeeFieldRefs
        operations: {
          findUnique: {
            args: Prisma.EmployeeFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmployeePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.EmployeeFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmployeePayload>
          }
          findFirst: {
            args: Prisma.EmployeeFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmployeePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.EmployeeFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmployeePayload>
          }
          findMany: {
            args: Prisma.EmployeeFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmployeePayload>[]
          }
          create: {
            args: Prisma.EmployeeCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmployeePayload>
          }
          createMany: {
            args: Prisma.EmployeeCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.EmployeeCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmployeePayload>[]
          }
          delete: {
            args: Prisma.EmployeeDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmployeePayload>
          }
          update: {
            args: Prisma.EmployeeUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmployeePayload>
          }
          deleteMany: {
            args: Prisma.EmployeeDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.EmployeeUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.EmployeeUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmployeePayload>[]
          }
          upsert: {
            args: Prisma.EmployeeUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmployeePayload>
          }
          aggregate: {
            args: Prisma.EmployeeAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateEmployee>
          }
          groupBy: {
            args: Prisma.EmployeeGroupByArgs<ExtArgs>
            result: $Utils.Optional<EmployeeGroupByOutputType>[]
          }
          count: {
            args: Prisma.EmployeeCountArgs<ExtArgs>
            result: $Utils.Optional<EmployeeCountAggregateOutputType> | number
          }
        }
      }
      AttendanceSession: {
        payload: Prisma.$AttendanceSessionPayload<ExtArgs>
        fields: Prisma.AttendanceSessionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AttendanceSessionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AttendanceSessionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AttendanceSessionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AttendanceSessionPayload>
          }
          findFirst: {
            args: Prisma.AttendanceSessionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AttendanceSessionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AttendanceSessionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AttendanceSessionPayload>
          }
          findMany: {
            args: Prisma.AttendanceSessionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AttendanceSessionPayload>[]
          }
          create: {
            args: Prisma.AttendanceSessionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AttendanceSessionPayload>
          }
          createMany: {
            args: Prisma.AttendanceSessionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AttendanceSessionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AttendanceSessionPayload>[]
          }
          delete: {
            args: Prisma.AttendanceSessionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AttendanceSessionPayload>
          }
          update: {
            args: Prisma.AttendanceSessionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AttendanceSessionPayload>
          }
          deleteMany: {
            args: Prisma.AttendanceSessionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AttendanceSessionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AttendanceSessionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AttendanceSessionPayload>[]
          }
          upsert: {
            args: Prisma.AttendanceSessionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AttendanceSessionPayload>
          }
          aggregate: {
            args: Prisma.AttendanceSessionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAttendanceSession>
          }
          groupBy: {
            args: Prisma.AttendanceSessionGroupByArgs<ExtArgs>
            result: $Utils.Optional<AttendanceSessionGroupByOutputType>[]
          }
          count: {
            args: Prisma.AttendanceSessionCountArgs<ExtArgs>
            result: $Utils.Optional<AttendanceSessionCountAggregateOutputType> | number
          }
        }
      }
      ProfileChangeEvent: {
        payload: Prisma.$ProfileChangeEventPayload<ExtArgs>
        fields: Prisma.ProfileChangeEventFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ProfileChangeEventFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProfileChangeEventPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ProfileChangeEventFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProfileChangeEventPayload>
          }
          findFirst: {
            args: Prisma.ProfileChangeEventFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProfileChangeEventPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ProfileChangeEventFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProfileChangeEventPayload>
          }
          findMany: {
            args: Prisma.ProfileChangeEventFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProfileChangeEventPayload>[]
          }
          create: {
            args: Prisma.ProfileChangeEventCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProfileChangeEventPayload>
          }
          createMany: {
            args: Prisma.ProfileChangeEventCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ProfileChangeEventCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProfileChangeEventPayload>[]
          }
          delete: {
            args: Prisma.ProfileChangeEventDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProfileChangeEventPayload>
          }
          update: {
            args: Prisma.ProfileChangeEventUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProfileChangeEventPayload>
          }
          deleteMany: {
            args: Prisma.ProfileChangeEventDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ProfileChangeEventUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ProfileChangeEventUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProfileChangeEventPayload>[]
          }
          upsert: {
            args: Prisma.ProfileChangeEventUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProfileChangeEventPayload>
          }
          aggregate: {
            args: Prisma.ProfileChangeEventAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateProfileChangeEvent>
          }
          groupBy: {
            args: Prisma.ProfileChangeEventGroupByArgs<ExtArgs>
            result: $Utils.Optional<ProfileChangeEventGroupByOutputType>[]
          }
          count: {
            args: Prisma.ProfileChangeEventCountArgs<ExtArgs>
            result: $Utils.Optional<ProfileChangeEventCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    employee?: EmployeeOmit
    attendanceSession?: AttendanceSessionOmit
    profileChangeEvent?: ProfileChangeEventOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type EmployeeCountOutputType
   */

  export type EmployeeCountOutputType = {
    attendanceSessions: number
    profileChangeEvents: number
  }

  export type EmployeeCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    attendanceSessions?: boolean | EmployeeCountOutputTypeCountAttendanceSessionsArgs
    profileChangeEvents?: boolean | EmployeeCountOutputTypeCountProfileChangeEventsArgs
  }

  // Custom InputTypes
  /**
   * EmployeeCountOutputType without action
   */
  export type EmployeeCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EmployeeCountOutputType
     */
    select?: EmployeeCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * EmployeeCountOutputType without action
   */
  export type EmployeeCountOutputTypeCountAttendanceSessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AttendanceSessionWhereInput
  }

  /**
   * EmployeeCountOutputType without action
   */
  export type EmployeeCountOutputTypeCountProfileChangeEventsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProfileChangeEventWhereInput
  }


  /**
   * Models
   */

  /**
   * Model Employee
   */

  export type AggregateEmployee = {
    _count: EmployeeCountAggregateOutputType | null
    _min: EmployeeMinAggregateOutputType | null
    _max: EmployeeMaxAggregateOutputType | null
  }

  export type EmployeeMinAggregateOutputType = {
    id: string | null
    name: string | null
    email: string | null
    position: string | null
    phone: string | null
    photoObjectKey: string | null
    status: $Enums.EmployeeStatus | null
    role: $Enums.EmployeeRole | null
    passwordHash: string | null
    mustChangePassword: boolean | null
    authProvider: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type EmployeeMaxAggregateOutputType = {
    id: string | null
    name: string | null
    email: string | null
    position: string | null
    phone: string | null
    photoObjectKey: string | null
    status: $Enums.EmployeeStatus | null
    role: $Enums.EmployeeRole | null
    passwordHash: string | null
    mustChangePassword: boolean | null
    authProvider: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type EmployeeCountAggregateOutputType = {
    id: number
    name: number
    email: number
    position: number
    phone: number
    photoObjectKey: number
    status: number
    role: number
    passwordHash: number
    mustChangePassword: number
    authProvider: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type EmployeeMinAggregateInputType = {
    id?: true
    name?: true
    email?: true
    position?: true
    phone?: true
    photoObjectKey?: true
    status?: true
    role?: true
    passwordHash?: true
    mustChangePassword?: true
    authProvider?: true
    createdAt?: true
    updatedAt?: true
  }

  export type EmployeeMaxAggregateInputType = {
    id?: true
    name?: true
    email?: true
    position?: true
    phone?: true
    photoObjectKey?: true
    status?: true
    role?: true
    passwordHash?: true
    mustChangePassword?: true
    authProvider?: true
    createdAt?: true
    updatedAt?: true
  }

  export type EmployeeCountAggregateInputType = {
    id?: true
    name?: true
    email?: true
    position?: true
    phone?: true
    photoObjectKey?: true
    status?: true
    role?: true
    passwordHash?: true
    mustChangePassword?: true
    authProvider?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type EmployeeAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Employee to aggregate.
     */
    where?: EmployeeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Employees to fetch.
     */
    orderBy?: EmployeeOrderByWithRelationInput | EmployeeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: EmployeeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Employees from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Employees.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Employees
    **/
    _count?: true | EmployeeCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: EmployeeMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: EmployeeMaxAggregateInputType
  }

  export type GetEmployeeAggregateType<T extends EmployeeAggregateArgs> = {
        [P in keyof T & keyof AggregateEmployee]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateEmployee[P]>
      : GetScalarType<T[P], AggregateEmployee[P]>
  }




  export type EmployeeGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: EmployeeWhereInput
    orderBy?: EmployeeOrderByWithAggregationInput | EmployeeOrderByWithAggregationInput[]
    by: EmployeeScalarFieldEnum[] | EmployeeScalarFieldEnum
    having?: EmployeeScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: EmployeeCountAggregateInputType | true
    _min?: EmployeeMinAggregateInputType
    _max?: EmployeeMaxAggregateInputType
  }

  export type EmployeeGroupByOutputType = {
    id: string
    name: string
    email: string
    position: string
    phone: string
    photoObjectKey: string | null
    status: $Enums.EmployeeStatus
    role: $Enums.EmployeeRole
    passwordHash: string
    mustChangePassword: boolean
    authProvider: string
    createdAt: Date
    updatedAt: Date
    _count: EmployeeCountAggregateOutputType | null
    _min: EmployeeMinAggregateOutputType | null
    _max: EmployeeMaxAggregateOutputType | null
  }

  type GetEmployeeGroupByPayload<T extends EmployeeGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<EmployeeGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof EmployeeGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], EmployeeGroupByOutputType[P]>
            : GetScalarType<T[P], EmployeeGroupByOutputType[P]>
        }
      >
    >


  export type EmployeeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    email?: boolean
    position?: boolean
    phone?: boolean
    photoObjectKey?: boolean
    status?: boolean
    role?: boolean
    passwordHash?: boolean
    mustChangePassword?: boolean
    authProvider?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    attendanceSessions?: boolean | Employee$attendanceSessionsArgs<ExtArgs>
    profileChangeEvents?: boolean | Employee$profileChangeEventsArgs<ExtArgs>
    _count?: boolean | EmployeeCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["employee"]>

  export type EmployeeSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    email?: boolean
    position?: boolean
    phone?: boolean
    photoObjectKey?: boolean
    status?: boolean
    role?: boolean
    passwordHash?: boolean
    mustChangePassword?: boolean
    authProvider?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["employee"]>

  export type EmployeeSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    email?: boolean
    position?: boolean
    phone?: boolean
    photoObjectKey?: boolean
    status?: boolean
    role?: boolean
    passwordHash?: boolean
    mustChangePassword?: boolean
    authProvider?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["employee"]>

  export type EmployeeSelectScalar = {
    id?: boolean
    name?: boolean
    email?: boolean
    position?: boolean
    phone?: boolean
    photoObjectKey?: boolean
    status?: boolean
    role?: boolean
    passwordHash?: boolean
    mustChangePassword?: boolean
    authProvider?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type EmployeeOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "email" | "position" | "phone" | "photoObjectKey" | "status" | "role" | "passwordHash" | "mustChangePassword" | "authProvider" | "createdAt" | "updatedAt", ExtArgs["result"]["employee"]>
  export type EmployeeInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    attendanceSessions?: boolean | Employee$attendanceSessionsArgs<ExtArgs>
    profileChangeEvents?: boolean | Employee$profileChangeEventsArgs<ExtArgs>
    _count?: boolean | EmployeeCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type EmployeeIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type EmployeeIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $EmployeePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Employee"
    objects: {
      attendanceSessions: Prisma.$AttendanceSessionPayload<ExtArgs>[]
      profileChangeEvents: Prisma.$ProfileChangeEventPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      email: string
      position: string
      phone: string
      photoObjectKey: string | null
      status: $Enums.EmployeeStatus
      role: $Enums.EmployeeRole
      passwordHash: string
      mustChangePassword: boolean
      authProvider: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["employee"]>
    composites: {}
  }

  type EmployeeGetPayload<S extends boolean | null | undefined | EmployeeDefaultArgs> = $Result.GetResult<Prisma.$EmployeePayload, S>

  type EmployeeCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<EmployeeFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: EmployeeCountAggregateInputType | true
    }

  export interface EmployeeDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Employee'], meta: { name: 'Employee' } }
    /**
     * Find zero or one Employee that matches the filter.
     * @param {EmployeeFindUniqueArgs} args - Arguments to find a Employee
     * @example
     * // Get one Employee
     * const employee = await prisma.employee.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends EmployeeFindUniqueArgs>(args: SelectSubset<T, EmployeeFindUniqueArgs<ExtArgs>>): Prisma__EmployeeClient<$Result.GetResult<Prisma.$EmployeePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Employee that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {EmployeeFindUniqueOrThrowArgs} args - Arguments to find a Employee
     * @example
     * // Get one Employee
     * const employee = await prisma.employee.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends EmployeeFindUniqueOrThrowArgs>(args: SelectSubset<T, EmployeeFindUniqueOrThrowArgs<ExtArgs>>): Prisma__EmployeeClient<$Result.GetResult<Prisma.$EmployeePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Employee that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EmployeeFindFirstArgs} args - Arguments to find a Employee
     * @example
     * // Get one Employee
     * const employee = await prisma.employee.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends EmployeeFindFirstArgs>(args?: SelectSubset<T, EmployeeFindFirstArgs<ExtArgs>>): Prisma__EmployeeClient<$Result.GetResult<Prisma.$EmployeePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Employee that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EmployeeFindFirstOrThrowArgs} args - Arguments to find a Employee
     * @example
     * // Get one Employee
     * const employee = await prisma.employee.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends EmployeeFindFirstOrThrowArgs>(args?: SelectSubset<T, EmployeeFindFirstOrThrowArgs<ExtArgs>>): Prisma__EmployeeClient<$Result.GetResult<Prisma.$EmployeePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Employees that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EmployeeFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Employees
     * const employees = await prisma.employee.findMany()
     * 
     * // Get first 10 Employees
     * const employees = await prisma.employee.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const employeeWithIdOnly = await prisma.employee.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends EmployeeFindManyArgs>(args?: SelectSubset<T, EmployeeFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EmployeePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Employee.
     * @param {EmployeeCreateArgs} args - Arguments to create a Employee.
     * @example
     * // Create one Employee
     * const Employee = await prisma.employee.create({
     *   data: {
     *     // ... data to create a Employee
     *   }
     * })
     * 
     */
    create<T extends EmployeeCreateArgs>(args: SelectSubset<T, EmployeeCreateArgs<ExtArgs>>): Prisma__EmployeeClient<$Result.GetResult<Prisma.$EmployeePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Employees.
     * @param {EmployeeCreateManyArgs} args - Arguments to create many Employees.
     * @example
     * // Create many Employees
     * const employee = await prisma.employee.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends EmployeeCreateManyArgs>(args?: SelectSubset<T, EmployeeCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Employees and returns the data saved in the database.
     * @param {EmployeeCreateManyAndReturnArgs} args - Arguments to create many Employees.
     * @example
     * // Create many Employees
     * const employee = await prisma.employee.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Employees and only return the `id`
     * const employeeWithIdOnly = await prisma.employee.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends EmployeeCreateManyAndReturnArgs>(args?: SelectSubset<T, EmployeeCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EmployeePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Employee.
     * @param {EmployeeDeleteArgs} args - Arguments to delete one Employee.
     * @example
     * // Delete one Employee
     * const Employee = await prisma.employee.delete({
     *   where: {
     *     // ... filter to delete one Employee
     *   }
     * })
     * 
     */
    delete<T extends EmployeeDeleteArgs>(args: SelectSubset<T, EmployeeDeleteArgs<ExtArgs>>): Prisma__EmployeeClient<$Result.GetResult<Prisma.$EmployeePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Employee.
     * @param {EmployeeUpdateArgs} args - Arguments to update one Employee.
     * @example
     * // Update one Employee
     * const employee = await prisma.employee.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends EmployeeUpdateArgs>(args: SelectSubset<T, EmployeeUpdateArgs<ExtArgs>>): Prisma__EmployeeClient<$Result.GetResult<Prisma.$EmployeePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Employees.
     * @param {EmployeeDeleteManyArgs} args - Arguments to filter Employees to delete.
     * @example
     * // Delete a few Employees
     * const { count } = await prisma.employee.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends EmployeeDeleteManyArgs>(args?: SelectSubset<T, EmployeeDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Employees.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EmployeeUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Employees
     * const employee = await prisma.employee.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends EmployeeUpdateManyArgs>(args: SelectSubset<T, EmployeeUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Employees and returns the data updated in the database.
     * @param {EmployeeUpdateManyAndReturnArgs} args - Arguments to update many Employees.
     * @example
     * // Update many Employees
     * const employee = await prisma.employee.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Employees and only return the `id`
     * const employeeWithIdOnly = await prisma.employee.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends EmployeeUpdateManyAndReturnArgs>(args: SelectSubset<T, EmployeeUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EmployeePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Employee.
     * @param {EmployeeUpsertArgs} args - Arguments to update or create a Employee.
     * @example
     * // Update or create a Employee
     * const employee = await prisma.employee.upsert({
     *   create: {
     *     // ... data to create a Employee
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Employee we want to update
     *   }
     * })
     */
    upsert<T extends EmployeeUpsertArgs>(args: SelectSubset<T, EmployeeUpsertArgs<ExtArgs>>): Prisma__EmployeeClient<$Result.GetResult<Prisma.$EmployeePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Employees.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EmployeeCountArgs} args - Arguments to filter Employees to count.
     * @example
     * // Count the number of Employees
     * const count = await prisma.employee.count({
     *   where: {
     *     // ... the filter for the Employees we want to count
     *   }
     * })
    **/
    count<T extends EmployeeCountArgs>(
      args?: Subset<T, EmployeeCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], EmployeeCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Employee.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EmployeeAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends EmployeeAggregateArgs>(args: Subset<T, EmployeeAggregateArgs>): Prisma.PrismaPromise<GetEmployeeAggregateType<T>>

    /**
     * Group by Employee.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EmployeeGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends EmployeeGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: EmployeeGroupByArgs['orderBy'] }
        : { orderBy?: EmployeeGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, EmployeeGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetEmployeeGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Employee model
   */
  readonly fields: EmployeeFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Employee.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__EmployeeClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    attendanceSessions<T extends Employee$attendanceSessionsArgs<ExtArgs> = {}>(args?: Subset<T, Employee$attendanceSessionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AttendanceSessionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    profileChangeEvents<T extends Employee$profileChangeEventsArgs<ExtArgs> = {}>(args?: Subset<T, Employee$profileChangeEventsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProfileChangeEventPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Employee model
   */
  interface EmployeeFieldRefs {
    readonly id: FieldRef<"Employee", 'String'>
    readonly name: FieldRef<"Employee", 'String'>
    readonly email: FieldRef<"Employee", 'String'>
    readonly position: FieldRef<"Employee", 'String'>
    readonly phone: FieldRef<"Employee", 'String'>
    readonly photoObjectKey: FieldRef<"Employee", 'String'>
    readonly status: FieldRef<"Employee", 'EmployeeStatus'>
    readonly role: FieldRef<"Employee", 'EmployeeRole'>
    readonly passwordHash: FieldRef<"Employee", 'String'>
    readonly mustChangePassword: FieldRef<"Employee", 'Boolean'>
    readonly authProvider: FieldRef<"Employee", 'String'>
    readonly createdAt: FieldRef<"Employee", 'DateTime'>
    readonly updatedAt: FieldRef<"Employee", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Employee findUnique
   */
  export type EmployeeFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Employee
     */
    select?: EmployeeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Employee
     */
    omit?: EmployeeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmployeeInclude<ExtArgs> | null
    /**
     * Filter, which Employee to fetch.
     */
    where: EmployeeWhereUniqueInput
  }

  /**
   * Employee findUniqueOrThrow
   */
  export type EmployeeFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Employee
     */
    select?: EmployeeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Employee
     */
    omit?: EmployeeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmployeeInclude<ExtArgs> | null
    /**
     * Filter, which Employee to fetch.
     */
    where: EmployeeWhereUniqueInput
  }

  /**
   * Employee findFirst
   */
  export type EmployeeFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Employee
     */
    select?: EmployeeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Employee
     */
    omit?: EmployeeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmployeeInclude<ExtArgs> | null
    /**
     * Filter, which Employee to fetch.
     */
    where?: EmployeeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Employees to fetch.
     */
    orderBy?: EmployeeOrderByWithRelationInput | EmployeeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Employees.
     */
    cursor?: EmployeeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Employees from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Employees.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Employees.
     */
    distinct?: EmployeeScalarFieldEnum | EmployeeScalarFieldEnum[]
  }

  /**
   * Employee findFirstOrThrow
   */
  export type EmployeeFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Employee
     */
    select?: EmployeeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Employee
     */
    omit?: EmployeeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmployeeInclude<ExtArgs> | null
    /**
     * Filter, which Employee to fetch.
     */
    where?: EmployeeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Employees to fetch.
     */
    orderBy?: EmployeeOrderByWithRelationInput | EmployeeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Employees.
     */
    cursor?: EmployeeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Employees from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Employees.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Employees.
     */
    distinct?: EmployeeScalarFieldEnum | EmployeeScalarFieldEnum[]
  }

  /**
   * Employee findMany
   */
  export type EmployeeFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Employee
     */
    select?: EmployeeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Employee
     */
    omit?: EmployeeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmployeeInclude<ExtArgs> | null
    /**
     * Filter, which Employees to fetch.
     */
    where?: EmployeeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Employees to fetch.
     */
    orderBy?: EmployeeOrderByWithRelationInput | EmployeeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Employees.
     */
    cursor?: EmployeeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Employees from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Employees.
     */
    skip?: number
    distinct?: EmployeeScalarFieldEnum | EmployeeScalarFieldEnum[]
  }

  /**
   * Employee create
   */
  export type EmployeeCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Employee
     */
    select?: EmployeeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Employee
     */
    omit?: EmployeeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmployeeInclude<ExtArgs> | null
    /**
     * The data needed to create a Employee.
     */
    data: XOR<EmployeeCreateInput, EmployeeUncheckedCreateInput>
  }

  /**
   * Employee createMany
   */
  export type EmployeeCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Employees.
     */
    data: EmployeeCreateManyInput | EmployeeCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Employee createManyAndReturn
   */
  export type EmployeeCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Employee
     */
    select?: EmployeeSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Employee
     */
    omit?: EmployeeOmit<ExtArgs> | null
    /**
     * The data used to create many Employees.
     */
    data: EmployeeCreateManyInput | EmployeeCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Employee update
   */
  export type EmployeeUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Employee
     */
    select?: EmployeeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Employee
     */
    omit?: EmployeeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmployeeInclude<ExtArgs> | null
    /**
     * The data needed to update a Employee.
     */
    data: XOR<EmployeeUpdateInput, EmployeeUncheckedUpdateInput>
    /**
     * Choose, which Employee to update.
     */
    where: EmployeeWhereUniqueInput
  }

  /**
   * Employee updateMany
   */
  export type EmployeeUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Employees.
     */
    data: XOR<EmployeeUpdateManyMutationInput, EmployeeUncheckedUpdateManyInput>
    /**
     * Filter which Employees to update
     */
    where?: EmployeeWhereInput
    /**
     * Limit how many Employees to update.
     */
    limit?: number
  }

  /**
   * Employee updateManyAndReturn
   */
  export type EmployeeUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Employee
     */
    select?: EmployeeSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Employee
     */
    omit?: EmployeeOmit<ExtArgs> | null
    /**
     * The data used to update Employees.
     */
    data: XOR<EmployeeUpdateManyMutationInput, EmployeeUncheckedUpdateManyInput>
    /**
     * Filter which Employees to update
     */
    where?: EmployeeWhereInput
    /**
     * Limit how many Employees to update.
     */
    limit?: number
  }

  /**
   * Employee upsert
   */
  export type EmployeeUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Employee
     */
    select?: EmployeeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Employee
     */
    omit?: EmployeeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmployeeInclude<ExtArgs> | null
    /**
     * The filter to search for the Employee to update in case it exists.
     */
    where: EmployeeWhereUniqueInput
    /**
     * In case the Employee found by the `where` argument doesn't exist, create a new Employee with this data.
     */
    create: XOR<EmployeeCreateInput, EmployeeUncheckedCreateInput>
    /**
     * In case the Employee was found with the provided `where` argument, update it with this data.
     */
    update: XOR<EmployeeUpdateInput, EmployeeUncheckedUpdateInput>
  }

  /**
   * Employee delete
   */
  export type EmployeeDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Employee
     */
    select?: EmployeeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Employee
     */
    omit?: EmployeeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmployeeInclude<ExtArgs> | null
    /**
     * Filter which Employee to delete.
     */
    where: EmployeeWhereUniqueInput
  }

  /**
   * Employee deleteMany
   */
  export type EmployeeDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Employees to delete
     */
    where?: EmployeeWhereInput
    /**
     * Limit how many Employees to delete.
     */
    limit?: number
  }

  /**
   * Employee.attendanceSessions
   */
  export type Employee$attendanceSessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AttendanceSession
     */
    select?: AttendanceSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AttendanceSession
     */
    omit?: AttendanceSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AttendanceSessionInclude<ExtArgs> | null
    where?: AttendanceSessionWhereInput
    orderBy?: AttendanceSessionOrderByWithRelationInput | AttendanceSessionOrderByWithRelationInput[]
    cursor?: AttendanceSessionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AttendanceSessionScalarFieldEnum | AttendanceSessionScalarFieldEnum[]
  }

  /**
   * Employee.profileChangeEvents
   */
  export type Employee$profileChangeEventsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProfileChangeEvent
     */
    select?: ProfileChangeEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProfileChangeEvent
     */
    omit?: ProfileChangeEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProfileChangeEventInclude<ExtArgs> | null
    where?: ProfileChangeEventWhereInput
    orderBy?: ProfileChangeEventOrderByWithRelationInput | ProfileChangeEventOrderByWithRelationInput[]
    cursor?: ProfileChangeEventWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ProfileChangeEventScalarFieldEnum | ProfileChangeEventScalarFieldEnum[]
  }

  /**
   * Employee without action
   */
  export type EmployeeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Employee
     */
    select?: EmployeeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Employee
     */
    omit?: EmployeeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmployeeInclude<ExtArgs> | null
  }


  /**
   * Model AttendanceSession
   */

  export type AggregateAttendanceSession = {
    _count: AttendanceSessionCountAggregateOutputType | null
    _min: AttendanceSessionMinAggregateOutputType | null
    _max: AttendanceSessionMaxAggregateOutputType | null
  }

  export type AttendanceSessionMinAggregateOutputType = {
    id: string | null
    employeeId: string | null
    workDate: Date | null
    clockInAt: Date | null
    clockOutAt: Date | null
    clockInKey: string | null
    clockOutKey: string | null
    closedBySystem: boolean | null
  }

  export type AttendanceSessionMaxAggregateOutputType = {
    id: string | null
    employeeId: string | null
    workDate: Date | null
    clockInAt: Date | null
    clockOutAt: Date | null
    clockInKey: string | null
    clockOutKey: string | null
    closedBySystem: boolean | null
  }

  export type AttendanceSessionCountAggregateOutputType = {
    id: number
    employeeId: number
    workDate: number
    clockInAt: number
    clockOutAt: number
    clockInKey: number
    clockOutKey: number
    closedBySystem: number
    _all: number
  }


  export type AttendanceSessionMinAggregateInputType = {
    id?: true
    employeeId?: true
    workDate?: true
    clockInAt?: true
    clockOutAt?: true
    clockInKey?: true
    clockOutKey?: true
    closedBySystem?: true
  }

  export type AttendanceSessionMaxAggregateInputType = {
    id?: true
    employeeId?: true
    workDate?: true
    clockInAt?: true
    clockOutAt?: true
    clockInKey?: true
    clockOutKey?: true
    closedBySystem?: true
  }

  export type AttendanceSessionCountAggregateInputType = {
    id?: true
    employeeId?: true
    workDate?: true
    clockInAt?: true
    clockOutAt?: true
    clockInKey?: true
    clockOutKey?: true
    closedBySystem?: true
    _all?: true
  }

  export type AttendanceSessionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AttendanceSession to aggregate.
     */
    where?: AttendanceSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AttendanceSessions to fetch.
     */
    orderBy?: AttendanceSessionOrderByWithRelationInput | AttendanceSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AttendanceSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AttendanceSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AttendanceSessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AttendanceSessions
    **/
    _count?: true | AttendanceSessionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AttendanceSessionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AttendanceSessionMaxAggregateInputType
  }

  export type GetAttendanceSessionAggregateType<T extends AttendanceSessionAggregateArgs> = {
        [P in keyof T & keyof AggregateAttendanceSession]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAttendanceSession[P]>
      : GetScalarType<T[P], AggregateAttendanceSession[P]>
  }




  export type AttendanceSessionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AttendanceSessionWhereInput
    orderBy?: AttendanceSessionOrderByWithAggregationInput | AttendanceSessionOrderByWithAggregationInput[]
    by: AttendanceSessionScalarFieldEnum[] | AttendanceSessionScalarFieldEnum
    having?: AttendanceSessionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AttendanceSessionCountAggregateInputType | true
    _min?: AttendanceSessionMinAggregateInputType
    _max?: AttendanceSessionMaxAggregateInputType
  }

  export type AttendanceSessionGroupByOutputType = {
    id: string
    employeeId: string
    workDate: Date
    clockInAt: Date
    clockOutAt: Date | null
    clockInKey: string
    clockOutKey: string | null
    closedBySystem: boolean
    _count: AttendanceSessionCountAggregateOutputType | null
    _min: AttendanceSessionMinAggregateOutputType | null
    _max: AttendanceSessionMaxAggregateOutputType | null
  }

  type GetAttendanceSessionGroupByPayload<T extends AttendanceSessionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AttendanceSessionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AttendanceSessionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AttendanceSessionGroupByOutputType[P]>
            : GetScalarType<T[P], AttendanceSessionGroupByOutputType[P]>
        }
      >
    >


  export type AttendanceSessionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    employeeId?: boolean
    workDate?: boolean
    clockInAt?: boolean
    clockOutAt?: boolean
    clockInKey?: boolean
    clockOutKey?: boolean
    closedBySystem?: boolean
    employee?: boolean | EmployeeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["attendanceSession"]>

  export type AttendanceSessionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    employeeId?: boolean
    workDate?: boolean
    clockInAt?: boolean
    clockOutAt?: boolean
    clockInKey?: boolean
    clockOutKey?: boolean
    closedBySystem?: boolean
    employee?: boolean | EmployeeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["attendanceSession"]>

  export type AttendanceSessionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    employeeId?: boolean
    workDate?: boolean
    clockInAt?: boolean
    clockOutAt?: boolean
    clockInKey?: boolean
    clockOutKey?: boolean
    closedBySystem?: boolean
    employee?: boolean | EmployeeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["attendanceSession"]>

  export type AttendanceSessionSelectScalar = {
    id?: boolean
    employeeId?: boolean
    workDate?: boolean
    clockInAt?: boolean
    clockOutAt?: boolean
    clockInKey?: boolean
    clockOutKey?: boolean
    closedBySystem?: boolean
  }

  export type AttendanceSessionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "employeeId" | "workDate" | "clockInAt" | "clockOutAt" | "clockInKey" | "clockOutKey" | "closedBySystem", ExtArgs["result"]["attendanceSession"]>
  export type AttendanceSessionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    employee?: boolean | EmployeeDefaultArgs<ExtArgs>
  }
  export type AttendanceSessionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    employee?: boolean | EmployeeDefaultArgs<ExtArgs>
  }
  export type AttendanceSessionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    employee?: boolean | EmployeeDefaultArgs<ExtArgs>
  }

  export type $AttendanceSessionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AttendanceSession"
    objects: {
      employee: Prisma.$EmployeePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      employeeId: string
      workDate: Date
      clockInAt: Date
      clockOutAt: Date | null
      clockInKey: string
      clockOutKey: string | null
      closedBySystem: boolean
    }, ExtArgs["result"]["attendanceSession"]>
    composites: {}
  }

  type AttendanceSessionGetPayload<S extends boolean | null | undefined | AttendanceSessionDefaultArgs> = $Result.GetResult<Prisma.$AttendanceSessionPayload, S>

  type AttendanceSessionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AttendanceSessionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AttendanceSessionCountAggregateInputType | true
    }

  export interface AttendanceSessionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AttendanceSession'], meta: { name: 'AttendanceSession' } }
    /**
     * Find zero or one AttendanceSession that matches the filter.
     * @param {AttendanceSessionFindUniqueArgs} args - Arguments to find a AttendanceSession
     * @example
     * // Get one AttendanceSession
     * const attendanceSession = await prisma.attendanceSession.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AttendanceSessionFindUniqueArgs>(args: SelectSubset<T, AttendanceSessionFindUniqueArgs<ExtArgs>>): Prisma__AttendanceSessionClient<$Result.GetResult<Prisma.$AttendanceSessionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AttendanceSession that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AttendanceSessionFindUniqueOrThrowArgs} args - Arguments to find a AttendanceSession
     * @example
     * // Get one AttendanceSession
     * const attendanceSession = await prisma.attendanceSession.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AttendanceSessionFindUniqueOrThrowArgs>(args: SelectSubset<T, AttendanceSessionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AttendanceSessionClient<$Result.GetResult<Prisma.$AttendanceSessionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AttendanceSession that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AttendanceSessionFindFirstArgs} args - Arguments to find a AttendanceSession
     * @example
     * // Get one AttendanceSession
     * const attendanceSession = await prisma.attendanceSession.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AttendanceSessionFindFirstArgs>(args?: SelectSubset<T, AttendanceSessionFindFirstArgs<ExtArgs>>): Prisma__AttendanceSessionClient<$Result.GetResult<Prisma.$AttendanceSessionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AttendanceSession that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AttendanceSessionFindFirstOrThrowArgs} args - Arguments to find a AttendanceSession
     * @example
     * // Get one AttendanceSession
     * const attendanceSession = await prisma.attendanceSession.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AttendanceSessionFindFirstOrThrowArgs>(args?: SelectSubset<T, AttendanceSessionFindFirstOrThrowArgs<ExtArgs>>): Prisma__AttendanceSessionClient<$Result.GetResult<Prisma.$AttendanceSessionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AttendanceSessions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AttendanceSessionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AttendanceSessions
     * const attendanceSessions = await prisma.attendanceSession.findMany()
     * 
     * // Get first 10 AttendanceSessions
     * const attendanceSessions = await prisma.attendanceSession.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const attendanceSessionWithIdOnly = await prisma.attendanceSession.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AttendanceSessionFindManyArgs>(args?: SelectSubset<T, AttendanceSessionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AttendanceSessionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AttendanceSession.
     * @param {AttendanceSessionCreateArgs} args - Arguments to create a AttendanceSession.
     * @example
     * // Create one AttendanceSession
     * const AttendanceSession = await prisma.attendanceSession.create({
     *   data: {
     *     // ... data to create a AttendanceSession
     *   }
     * })
     * 
     */
    create<T extends AttendanceSessionCreateArgs>(args: SelectSubset<T, AttendanceSessionCreateArgs<ExtArgs>>): Prisma__AttendanceSessionClient<$Result.GetResult<Prisma.$AttendanceSessionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AttendanceSessions.
     * @param {AttendanceSessionCreateManyArgs} args - Arguments to create many AttendanceSessions.
     * @example
     * // Create many AttendanceSessions
     * const attendanceSession = await prisma.attendanceSession.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AttendanceSessionCreateManyArgs>(args?: SelectSubset<T, AttendanceSessionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AttendanceSessions and returns the data saved in the database.
     * @param {AttendanceSessionCreateManyAndReturnArgs} args - Arguments to create many AttendanceSessions.
     * @example
     * // Create many AttendanceSessions
     * const attendanceSession = await prisma.attendanceSession.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AttendanceSessions and only return the `id`
     * const attendanceSessionWithIdOnly = await prisma.attendanceSession.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AttendanceSessionCreateManyAndReturnArgs>(args?: SelectSubset<T, AttendanceSessionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AttendanceSessionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a AttendanceSession.
     * @param {AttendanceSessionDeleteArgs} args - Arguments to delete one AttendanceSession.
     * @example
     * // Delete one AttendanceSession
     * const AttendanceSession = await prisma.attendanceSession.delete({
     *   where: {
     *     // ... filter to delete one AttendanceSession
     *   }
     * })
     * 
     */
    delete<T extends AttendanceSessionDeleteArgs>(args: SelectSubset<T, AttendanceSessionDeleteArgs<ExtArgs>>): Prisma__AttendanceSessionClient<$Result.GetResult<Prisma.$AttendanceSessionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AttendanceSession.
     * @param {AttendanceSessionUpdateArgs} args - Arguments to update one AttendanceSession.
     * @example
     * // Update one AttendanceSession
     * const attendanceSession = await prisma.attendanceSession.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AttendanceSessionUpdateArgs>(args: SelectSubset<T, AttendanceSessionUpdateArgs<ExtArgs>>): Prisma__AttendanceSessionClient<$Result.GetResult<Prisma.$AttendanceSessionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AttendanceSessions.
     * @param {AttendanceSessionDeleteManyArgs} args - Arguments to filter AttendanceSessions to delete.
     * @example
     * // Delete a few AttendanceSessions
     * const { count } = await prisma.attendanceSession.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AttendanceSessionDeleteManyArgs>(args?: SelectSubset<T, AttendanceSessionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AttendanceSessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AttendanceSessionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AttendanceSessions
     * const attendanceSession = await prisma.attendanceSession.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AttendanceSessionUpdateManyArgs>(args: SelectSubset<T, AttendanceSessionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AttendanceSessions and returns the data updated in the database.
     * @param {AttendanceSessionUpdateManyAndReturnArgs} args - Arguments to update many AttendanceSessions.
     * @example
     * // Update many AttendanceSessions
     * const attendanceSession = await prisma.attendanceSession.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more AttendanceSessions and only return the `id`
     * const attendanceSessionWithIdOnly = await prisma.attendanceSession.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AttendanceSessionUpdateManyAndReturnArgs>(args: SelectSubset<T, AttendanceSessionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AttendanceSessionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one AttendanceSession.
     * @param {AttendanceSessionUpsertArgs} args - Arguments to update or create a AttendanceSession.
     * @example
     * // Update or create a AttendanceSession
     * const attendanceSession = await prisma.attendanceSession.upsert({
     *   create: {
     *     // ... data to create a AttendanceSession
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AttendanceSession we want to update
     *   }
     * })
     */
    upsert<T extends AttendanceSessionUpsertArgs>(args: SelectSubset<T, AttendanceSessionUpsertArgs<ExtArgs>>): Prisma__AttendanceSessionClient<$Result.GetResult<Prisma.$AttendanceSessionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AttendanceSessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AttendanceSessionCountArgs} args - Arguments to filter AttendanceSessions to count.
     * @example
     * // Count the number of AttendanceSessions
     * const count = await prisma.attendanceSession.count({
     *   where: {
     *     // ... the filter for the AttendanceSessions we want to count
     *   }
     * })
    **/
    count<T extends AttendanceSessionCountArgs>(
      args?: Subset<T, AttendanceSessionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AttendanceSessionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AttendanceSession.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AttendanceSessionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AttendanceSessionAggregateArgs>(args: Subset<T, AttendanceSessionAggregateArgs>): Prisma.PrismaPromise<GetAttendanceSessionAggregateType<T>>

    /**
     * Group by AttendanceSession.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AttendanceSessionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AttendanceSessionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AttendanceSessionGroupByArgs['orderBy'] }
        : { orderBy?: AttendanceSessionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AttendanceSessionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAttendanceSessionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AttendanceSession model
   */
  readonly fields: AttendanceSessionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AttendanceSession.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AttendanceSessionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    employee<T extends EmployeeDefaultArgs<ExtArgs> = {}>(args?: Subset<T, EmployeeDefaultArgs<ExtArgs>>): Prisma__EmployeeClient<$Result.GetResult<Prisma.$EmployeePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AttendanceSession model
   */
  interface AttendanceSessionFieldRefs {
    readonly id: FieldRef<"AttendanceSession", 'String'>
    readonly employeeId: FieldRef<"AttendanceSession", 'String'>
    readonly workDate: FieldRef<"AttendanceSession", 'DateTime'>
    readonly clockInAt: FieldRef<"AttendanceSession", 'DateTime'>
    readonly clockOutAt: FieldRef<"AttendanceSession", 'DateTime'>
    readonly clockInKey: FieldRef<"AttendanceSession", 'String'>
    readonly clockOutKey: FieldRef<"AttendanceSession", 'String'>
    readonly closedBySystem: FieldRef<"AttendanceSession", 'Boolean'>
  }
    

  // Custom InputTypes
  /**
   * AttendanceSession findUnique
   */
  export type AttendanceSessionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AttendanceSession
     */
    select?: AttendanceSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AttendanceSession
     */
    omit?: AttendanceSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AttendanceSessionInclude<ExtArgs> | null
    /**
     * Filter, which AttendanceSession to fetch.
     */
    where: AttendanceSessionWhereUniqueInput
  }

  /**
   * AttendanceSession findUniqueOrThrow
   */
  export type AttendanceSessionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AttendanceSession
     */
    select?: AttendanceSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AttendanceSession
     */
    omit?: AttendanceSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AttendanceSessionInclude<ExtArgs> | null
    /**
     * Filter, which AttendanceSession to fetch.
     */
    where: AttendanceSessionWhereUniqueInput
  }

  /**
   * AttendanceSession findFirst
   */
  export type AttendanceSessionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AttendanceSession
     */
    select?: AttendanceSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AttendanceSession
     */
    omit?: AttendanceSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AttendanceSessionInclude<ExtArgs> | null
    /**
     * Filter, which AttendanceSession to fetch.
     */
    where?: AttendanceSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AttendanceSessions to fetch.
     */
    orderBy?: AttendanceSessionOrderByWithRelationInput | AttendanceSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AttendanceSessions.
     */
    cursor?: AttendanceSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AttendanceSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AttendanceSessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AttendanceSessions.
     */
    distinct?: AttendanceSessionScalarFieldEnum | AttendanceSessionScalarFieldEnum[]
  }

  /**
   * AttendanceSession findFirstOrThrow
   */
  export type AttendanceSessionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AttendanceSession
     */
    select?: AttendanceSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AttendanceSession
     */
    omit?: AttendanceSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AttendanceSessionInclude<ExtArgs> | null
    /**
     * Filter, which AttendanceSession to fetch.
     */
    where?: AttendanceSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AttendanceSessions to fetch.
     */
    orderBy?: AttendanceSessionOrderByWithRelationInput | AttendanceSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AttendanceSessions.
     */
    cursor?: AttendanceSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AttendanceSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AttendanceSessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AttendanceSessions.
     */
    distinct?: AttendanceSessionScalarFieldEnum | AttendanceSessionScalarFieldEnum[]
  }

  /**
   * AttendanceSession findMany
   */
  export type AttendanceSessionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AttendanceSession
     */
    select?: AttendanceSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AttendanceSession
     */
    omit?: AttendanceSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AttendanceSessionInclude<ExtArgs> | null
    /**
     * Filter, which AttendanceSessions to fetch.
     */
    where?: AttendanceSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AttendanceSessions to fetch.
     */
    orderBy?: AttendanceSessionOrderByWithRelationInput | AttendanceSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AttendanceSessions.
     */
    cursor?: AttendanceSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AttendanceSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AttendanceSessions.
     */
    skip?: number
    distinct?: AttendanceSessionScalarFieldEnum | AttendanceSessionScalarFieldEnum[]
  }

  /**
   * AttendanceSession create
   */
  export type AttendanceSessionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AttendanceSession
     */
    select?: AttendanceSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AttendanceSession
     */
    omit?: AttendanceSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AttendanceSessionInclude<ExtArgs> | null
    /**
     * The data needed to create a AttendanceSession.
     */
    data: XOR<AttendanceSessionCreateInput, AttendanceSessionUncheckedCreateInput>
  }

  /**
   * AttendanceSession createMany
   */
  export type AttendanceSessionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AttendanceSessions.
     */
    data: AttendanceSessionCreateManyInput | AttendanceSessionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AttendanceSession createManyAndReturn
   */
  export type AttendanceSessionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AttendanceSession
     */
    select?: AttendanceSessionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AttendanceSession
     */
    omit?: AttendanceSessionOmit<ExtArgs> | null
    /**
     * The data used to create many AttendanceSessions.
     */
    data: AttendanceSessionCreateManyInput | AttendanceSessionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AttendanceSessionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * AttendanceSession update
   */
  export type AttendanceSessionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AttendanceSession
     */
    select?: AttendanceSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AttendanceSession
     */
    omit?: AttendanceSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AttendanceSessionInclude<ExtArgs> | null
    /**
     * The data needed to update a AttendanceSession.
     */
    data: XOR<AttendanceSessionUpdateInput, AttendanceSessionUncheckedUpdateInput>
    /**
     * Choose, which AttendanceSession to update.
     */
    where: AttendanceSessionWhereUniqueInput
  }

  /**
   * AttendanceSession updateMany
   */
  export type AttendanceSessionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AttendanceSessions.
     */
    data: XOR<AttendanceSessionUpdateManyMutationInput, AttendanceSessionUncheckedUpdateManyInput>
    /**
     * Filter which AttendanceSessions to update
     */
    where?: AttendanceSessionWhereInput
    /**
     * Limit how many AttendanceSessions to update.
     */
    limit?: number
  }

  /**
   * AttendanceSession updateManyAndReturn
   */
  export type AttendanceSessionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AttendanceSession
     */
    select?: AttendanceSessionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AttendanceSession
     */
    omit?: AttendanceSessionOmit<ExtArgs> | null
    /**
     * The data used to update AttendanceSessions.
     */
    data: XOR<AttendanceSessionUpdateManyMutationInput, AttendanceSessionUncheckedUpdateManyInput>
    /**
     * Filter which AttendanceSessions to update
     */
    where?: AttendanceSessionWhereInput
    /**
     * Limit how many AttendanceSessions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AttendanceSessionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * AttendanceSession upsert
   */
  export type AttendanceSessionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AttendanceSession
     */
    select?: AttendanceSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AttendanceSession
     */
    omit?: AttendanceSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AttendanceSessionInclude<ExtArgs> | null
    /**
     * The filter to search for the AttendanceSession to update in case it exists.
     */
    where: AttendanceSessionWhereUniqueInput
    /**
     * In case the AttendanceSession found by the `where` argument doesn't exist, create a new AttendanceSession with this data.
     */
    create: XOR<AttendanceSessionCreateInput, AttendanceSessionUncheckedCreateInput>
    /**
     * In case the AttendanceSession was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AttendanceSessionUpdateInput, AttendanceSessionUncheckedUpdateInput>
  }

  /**
   * AttendanceSession delete
   */
  export type AttendanceSessionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AttendanceSession
     */
    select?: AttendanceSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AttendanceSession
     */
    omit?: AttendanceSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AttendanceSessionInclude<ExtArgs> | null
    /**
     * Filter which AttendanceSession to delete.
     */
    where: AttendanceSessionWhereUniqueInput
  }

  /**
   * AttendanceSession deleteMany
   */
  export type AttendanceSessionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AttendanceSessions to delete
     */
    where?: AttendanceSessionWhereInput
    /**
     * Limit how many AttendanceSessions to delete.
     */
    limit?: number
  }

  /**
   * AttendanceSession without action
   */
  export type AttendanceSessionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AttendanceSession
     */
    select?: AttendanceSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AttendanceSession
     */
    omit?: AttendanceSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AttendanceSessionInclude<ExtArgs> | null
  }


  /**
   * Model ProfileChangeEvent
   */

  export type AggregateProfileChangeEvent = {
    _count: ProfileChangeEventCountAggregateOutputType | null
    _min: ProfileChangeEventMinAggregateOutputType | null
    _max: ProfileChangeEventMaxAggregateOutputType | null
  }

  export type ProfileChangeEventMinAggregateOutputType = {
    id: string | null
    employeeId: string | null
    actorId: string | null
    actorRole: $Enums.EmployeeRole | null
    occurredAt: Date | null
    publishedAt: Date | null
  }

  export type ProfileChangeEventMaxAggregateOutputType = {
    id: string | null
    employeeId: string | null
    actorId: string | null
    actorRole: $Enums.EmployeeRole | null
    occurredAt: Date | null
    publishedAt: Date | null
  }

  export type ProfileChangeEventCountAggregateOutputType = {
    id: number
    employeeId: number
    actorId: number
    actorRole: number
    changedFields: number
    beforeValues: number
    afterValues: number
    occurredAt: number
    publishedAt: number
    _all: number
  }


  export type ProfileChangeEventMinAggregateInputType = {
    id?: true
    employeeId?: true
    actorId?: true
    actorRole?: true
    occurredAt?: true
    publishedAt?: true
  }

  export type ProfileChangeEventMaxAggregateInputType = {
    id?: true
    employeeId?: true
    actorId?: true
    actorRole?: true
    occurredAt?: true
    publishedAt?: true
  }

  export type ProfileChangeEventCountAggregateInputType = {
    id?: true
    employeeId?: true
    actorId?: true
    actorRole?: true
    changedFields?: true
    beforeValues?: true
    afterValues?: true
    occurredAt?: true
    publishedAt?: true
    _all?: true
  }

  export type ProfileChangeEventAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ProfileChangeEvent to aggregate.
     */
    where?: ProfileChangeEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProfileChangeEvents to fetch.
     */
    orderBy?: ProfileChangeEventOrderByWithRelationInput | ProfileChangeEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ProfileChangeEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProfileChangeEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProfileChangeEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ProfileChangeEvents
    **/
    _count?: true | ProfileChangeEventCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ProfileChangeEventMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ProfileChangeEventMaxAggregateInputType
  }

  export type GetProfileChangeEventAggregateType<T extends ProfileChangeEventAggregateArgs> = {
        [P in keyof T & keyof AggregateProfileChangeEvent]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateProfileChangeEvent[P]>
      : GetScalarType<T[P], AggregateProfileChangeEvent[P]>
  }




  export type ProfileChangeEventGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProfileChangeEventWhereInput
    orderBy?: ProfileChangeEventOrderByWithAggregationInput | ProfileChangeEventOrderByWithAggregationInput[]
    by: ProfileChangeEventScalarFieldEnum[] | ProfileChangeEventScalarFieldEnum
    having?: ProfileChangeEventScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ProfileChangeEventCountAggregateInputType | true
    _min?: ProfileChangeEventMinAggregateInputType
    _max?: ProfileChangeEventMaxAggregateInputType
  }

  export type ProfileChangeEventGroupByOutputType = {
    id: string
    employeeId: string
    actorId: string
    actorRole: $Enums.EmployeeRole
    changedFields: string[]
    beforeValues: JsonValue | null
    afterValues: JsonValue | null
    occurredAt: Date
    publishedAt: Date | null
    _count: ProfileChangeEventCountAggregateOutputType | null
    _min: ProfileChangeEventMinAggregateOutputType | null
    _max: ProfileChangeEventMaxAggregateOutputType | null
  }

  type GetProfileChangeEventGroupByPayload<T extends ProfileChangeEventGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ProfileChangeEventGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ProfileChangeEventGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ProfileChangeEventGroupByOutputType[P]>
            : GetScalarType<T[P], ProfileChangeEventGroupByOutputType[P]>
        }
      >
    >


  export type ProfileChangeEventSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    employeeId?: boolean
    actorId?: boolean
    actorRole?: boolean
    changedFields?: boolean
    beforeValues?: boolean
    afterValues?: boolean
    occurredAt?: boolean
    publishedAt?: boolean
    employee?: boolean | EmployeeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["profileChangeEvent"]>

  export type ProfileChangeEventSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    employeeId?: boolean
    actorId?: boolean
    actorRole?: boolean
    changedFields?: boolean
    beforeValues?: boolean
    afterValues?: boolean
    occurredAt?: boolean
    publishedAt?: boolean
    employee?: boolean | EmployeeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["profileChangeEvent"]>

  export type ProfileChangeEventSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    employeeId?: boolean
    actorId?: boolean
    actorRole?: boolean
    changedFields?: boolean
    beforeValues?: boolean
    afterValues?: boolean
    occurredAt?: boolean
    publishedAt?: boolean
    employee?: boolean | EmployeeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["profileChangeEvent"]>

  export type ProfileChangeEventSelectScalar = {
    id?: boolean
    employeeId?: boolean
    actorId?: boolean
    actorRole?: boolean
    changedFields?: boolean
    beforeValues?: boolean
    afterValues?: boolean
    occurredAt?: boolean
    publishedAt?: boolean
  }

  export type ProfileChangeEventOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "employeeId" | "actorId" | "actorRole" | "changedFields" | "beforeValues" | "afterValues" | "occurredAt" | "publishedAt", ExtArgs["result"]["profileChangeEvent"]>
  export type ProfileChangeEventInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    employee?: boolean | EmployeeDefaultArgs<ExtArgs>
  }
  export type ProfileChangeEventIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    employee?: boolean | EmployeeDefaultArgs<ExtArgs>
  }
  export type ProfileChangeEventIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    employee?: boolean | EmployeeDefaultArgs<ExtArgs>
  }

  export type $ProfileChangeEventPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ProfileChangeEvent"
    objects: {
      employee: Prisma.$EmployeePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      employeeId: string
      actorId: string
      actorRole: $Enums.EmployeeRole
      changedFields: string[]
      beforeValues: Prisma.JsonValue | null
      afterValues: Prisma.JsonValue | null
      occurredAt: Date
      publishedAt: Date | null
    }, ExtArgs["result"]["profileChangeEvent"]>
    composites: {}
  }

  type ProfileChangeEventGetPayload<S extends boolean | null | undefined | ProfileChangeEventDefaultArgs> = $Result.GetResult<Prisma.$ProfileChangeEventPayload, S>

  type ProfileChangeEventCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ProfileChangeEventFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ProfileChangeEventCountAggregateInputType | true
    }

  export interface ProfileChangeEventDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ProfileChangeEvent'], meta: { name: 'ProfileChangeEvent' } }
    /**
     * Find zero or one ProfileChangeEvent that matches the filter.
     * @param {ProfileChangeEventFindUniqueArgs} args - Arguments to find a ProfileChangeEvent
     * @example
     * // Get one ProfileChangeEvent
     * const profileChangeEvent = await prisma.profileChangeEvent.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ProfileChangeEventFindUniqueArgs>(args: SelectSubset<T, ProfileChangeEventFindUniqueArgs<ExtArgs>>): Prisma__ProfileChangeEventClient<$Result.GetResult<Prisma.$ProfileChangeEventPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ProfileChangeEvent that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ProfileChangeEventFindUniqueOrThrowArgs} args - Arguments to find a ProfileChangeEvent
     * @example
     * // Get one ProfileChangeEvent
     * const profileChangeEvent = await prisma.profileChangeEvent.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ProfileChangeEventFindUniqueOrThrowArgs>(args: SelectSubset<T, ProfileChangeEventFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ProfileChangeEventClient<$Result.GetResult<Prisma.$ProfileChangeEventPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ProfileChangeEvent that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProfileChangeEventFindFirstArgs} args - Arguments to find a ProfileChangeEvent
     * @example
     * // Get one ProfileChangeEvent
     * const profileChangeEvent = await prisma.profileChangeEvent.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ProfileChangeEventFindFirstArgs>(args?: SelectSubset<T, ProfileChangeEventFindFirstArgs<ExtArgs>>): Prisma__ProfileChangeEventClient<$Result.GetResult<Prisma.$ProfileChangeEventPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ProfileChangeEvent that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProfileChangeEventFindFirstOrThrowArgs} args - Arguments to find a ProfileChangeEvent
     * @example
     * // Get one ProfileChangeEvent
     * const profileChangeEvent = await prisma.profileChangeEvent.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ProfileChangeEventFindFirstOrThrowArgs>(args?: SelectSubset<T, ProfileChangeEventFindFirstOrThrowArgs<ExtArgs>>): Prisma__ProfileChangeEventClient<$Result.GetResult<Prisma.$ProfileChangeEventPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ProfileChangeEvents that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProfileChangeEventFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ProfileChangeEvents
     * const profileChangeEvents = await prisma.profileChangeEvent.findMany()
     * 
     * // Get first 10 ProfileChangeEvents
     * const profileChangeEvents = await prisma.profileChangeEvent.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const profileChangeEventWithIdOnly = await prisma.profileChangeEvent.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ProfileChangeEventFindManyArgs>(args?: SelectSubset<T, ProfileChangeEventFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProfileChangeEventPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ProfileChangeEvent.
     * @param {ProfileChangeEventCreateArgs} args - Arguments to create a ProfileChangeEvent.
     * @example
     * // Create one ProfileChangeEvent
     * const ProfileChangeEvent = await prisma.profileChangeEvent.create({
     *   data: {
     *     // ... data to create a ProfileChangeEvent
     *   }
     * })
     * 
     */
    create<T extends ProfileChangeEventCreateArgs>(args: SelectSubset<T, ProfileChangeEventCreateArgs<ExtArgs>>): Prisma__ProfileChangeEventClient<$Result.GetResult<Prisma.$ProfileChangeEventPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ProfileChangeEvents.
     * @param {ProfileChangeEventCreateManyArgs} args - Arguments to create many ProfileChangeEvents.
     * @example
     * // Create many ProfileChangeEvents
     * const profileChangeEvent = await prisma.profileChangeEvent.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ProfileChangeEventCreateManyArgs>(args?: SelectSubset<T, ProfileChangeEventCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ProfileChangeEvents and returns the data saved in the database.
     * @param {ProfileChangeEventCreateManyAndReturnArgs} args - Arguments to create many ProfileChangeEvents.
     * @example
     * // Create many ProfileChangeEvents
     * const profileChangeEvent = await prisma.profileChangeEvent.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ProfileChangeEvents and only return the `id`
     * const profileChangeEventWithIdOnly = await prisma.profileChangeEvent.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ProfileChangeEventCreateManyAndReturnArgs>(args?: SelectSubset<T, ProfileChangeEventCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProfileChangeEventPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ProfileChangeEvent.
     * @param {ProfileChangeEventDeleteArgs} args - Arguments to delete one ProfileChangeEvent.
     * @example
     * // Delete one ProfileChangeEvent
     * const ProfileChangeEvent = await prisma.profileChangeEvent.delete({
     *   where: {
     *     // ... filter to delete one ProfileChangeEvent
     *   }
     * })
     * 
     */
    delete<T extends ProfileChangeEventDeleteArgs>(args: SelectSubset<T, ProfileChangeEventDeleteArgs<ExtArgs>>): Prisma__ProfileChangeEventClient<$Result.GetResult<Prisma.$ProfileChangeEventPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ProfileChangeEvent.
     * @param {ProfileChangeEventUpdateArgs} args - Arguments to update one ProfileChangeEvent.
     * @example
     * // Update one ProfileChangeEvent
     * const profileChangeEvent = await prisma.profileChangeEvent.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ProfileChangeEventUpdateArgs>(args: SelectSubset<T, ProfileChangeEventUpdateArgs<ExtArgs>>): Prisma__ProfileChangeEventClient<$Result.GetResult<Prisma.$ProfileChangeEventPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ProfileChangeEvents.
     * @param {ProfileChangeEventDeleteManyArgs} args - Arguments to filter ProfileChangeEvents to delete.
     * @example
     * // Delete a few ProfileChangeEvents
     * const { count } = await prisma.profileChangeEvent.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ProfileChangeEventDeleteManyArgs>(args?: SelectSubset<T, ProfileChangeEventDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ProfileChangeEvents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProfileChangeEventUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ProfileChangeEvents
     * const profileChangeEvent = await prisma.profileChangeEvent.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ProfileChangeEventUpdateManyArgs>(args: SelectSubset<T, ProfileChangeEventUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ProfileChangeEvents and returns the data updated in the database.
     * @param {ProfileChangeEventUpdateManyAndReturnArgs} args - Arguments to update many ProfileChangeEvents.
     * @example
     * // Update many ProfileChangeEvents
     * const profileChangeEvent = await prisma.profileChangeEvent.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ProfileChangeEvents and only return the `id`
     * const profileChangeEventWithIdOnly = await prisma.profileChangeEvent.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ProfileChangeEventUpdateManyAndReturnArgs>(args: SelectSubset<T, ProfileChangeEventUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProfileChangeEventPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ProfileChangeEvent.
     * @param {ProfileChangeEventUpsertArgs} args - Arguments to update or create a ProfileChangeEvent.
     * @example
     * // Update or create a ProfileChangeEvent
     * const profileChangeEvent = await prisma.profileChangeEvent.upsert({
     *   create: {
     *     // ... data to create a ProfileChangeEvent
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ProfileChangeEvent we want to update
     *   }
     * })
     */
    upsert<T extends ProfileChangeEventUpsertArgs>(args: SelectSubset<T, ProfileChangeEventUpsertArgs<ExtArgs>>): Prisma__ProfileChangeEventClient<$Result.GetResult<Prisma.$ProfileChangeEventPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ProfileChangeEvents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProfileChangeEventCountArgs} args - Arguments to filter ProfileChangeEvents to count.
     * @example
     * // Count the number of ProfileChangeEvents
     * const count = await prisma.profileChangeEvent.count({
     *   where: {
     *     // ... the filter for the ProfileChangeEvents we want to count
     *   }
     * })
    **/
    count<T extends ProfileChangeEventCountArgs>(
      args?: Subset<T, ProfileChangeEventCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ProfileChangeEventCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ProfileChangeEvent.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProfileChangeEventAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ProfileChangeEventAggregateArgs>(args: Subset<T, ProfileChangeEventAggregateArgs>): Prisma.PrismaPromise<GetProfileChangeEventAggregateType<T>>

    /**
     * Group by ProfileChangeEvent.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProfileChangeEventGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ProfileChangeEventGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ProfileChangeEventGroupByArgs['orderBy'] }
        : { orderBy?: ProfileChangeEventGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ProfileChangeEventGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetProfileChangeEventGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ProfileChangeEvent model
   */
  readonly fields: ProfileChangeEventFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ProfileChangeEvent.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ProfileChangeEventClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    employee<T extends EmployeeDefaultArgs<ExtArgs> = {}>(args?: Subset<T, EmployeeDefaultArgs<ExtArgs>>): Prisma__EmployeeClient<$Result.GetResult<Prisma.$EmployeePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ProfileChangeEvent model
   */
  interface ProfileChangeEventFieldRefs {
    readonly id: FieldRef<"ProfileChangeEvent", 'String'>
    readonly employeeId: FieldRef<"ProfileChangeEvent", 'String'>
    readonly actorId: FieldRef<"ProfileChangeEvent", 'String'>
    readonly actorRole: FieldRef<"ProfileChangeEvent", 'EmployeeRole'>
    readonly changedFields: FieldRef<"ProfileChangeEvent", 'String[]'>
    readonly beforeValues: FieldRef<"ProfileChangeEvent", 'Json'>
    readonly afterValues: FieldRef<"ProfileChangeEvent", 'Json'>
    readonly occurredAt: FieldRef<"ProfileChangeEvent", 'DateTime'>
    readonly publishedAt: FieldRef<"ProfileChangeEvent", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ProfileChangeEvent findUnique
   */
  export type ProfileChangeEventFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProfileChangeEvent
     */
    select?: ProfileChangeEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProfileChangeEvent
     */
    omit?: ProfileChangeEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProfileChangeEventInclude<ExtArgs> | null
    /**
     * Filter, which ProfileChangeEvent to fetch.
     */
    where: ProfileChangeEventWhereUniqueInput
  }

  /**
   * ProfileChangeEvent findUniqueOrThrow
   */
  export type ProfileChangeEventFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProfileChangeEvent
     */
    select?: ProfileChangeEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProfileChangeEvent
     */
    omit?: ProfileChangeEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProfileChangeEventInclude<ExtArgs> | null
    /**
     * Filter, which ProfileChangeEvent to fetch.
     */
    where: ProfileChangeEventWhereUniqueInput
  }

  /**
   * ProfileChangeEvent findFirst
   */
  export type ProfileChangeEventFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProfileChangeEvent
     */
    select?: ProfileChangeEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProfileChangeEvent
     */
    omit?: ProfileChangeEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProfileChangeEventInclude<ExtArgs> | null
    /**
     * Filter, which ProfileChangeEvent to fetch.
     */
    where?: ProfileChangeEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProfileChangeEvents to fetch.
     */
    orderBy?: ProfileChangeEventOrderByWithRelationInput | ProfileChangeEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ProfileChangeEvents.
     */
    cursor?: ProfileChangeEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProfileChangeEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProfileChangeEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ProfileChangeEvents.
     */
    distinct?: ProfileChangeEventScalarFieldEnum | ProfileChangeEventScalarFieldEnum[]
  }

  /**
   * ProfileChangeEvent findFirstOrThrow
   */
  export type ProfileChangeEventFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProfileChangeEvent
     */
    select?: ProfileChangeEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProfileChangeEvent
     */
    omit?: ProfileChangeEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProfileChangeEventInclude<ExtArgs> | null
    /**
     * Filter, which ProfileChangeEvent to fetch.
     */
    where?: ProfileChangeEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProfileChangeEvents to fetch.
     */
    orderBy?: ProfileChangeEventOrderByWithRelationInput | ProfileChangeEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ProfileChangeEvents.
     */
    cursor?: ProfileChangeEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProfileChangeEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProfileChangeEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ProfileChangeEvents.
     */
    distinct?: ProfileChangeEventScalarFieldEnum | ProfileChangeEventScalarFieldEnum[]
  }

  /**
   * ProfileChangeEvent findMany
   */
  export type ProfileChangeEventFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProfileChangeEvent
     */
    select?: ProfileChangeEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProfileChangeEvent
     */
    omit?: ProfileChangeEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProfileChangeEventInclude<ExtArgs> | null
    /**
     * Filter, which ProfileChangeEvents to fetch.
     */
    where?: ProfileChangeEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProfileChangeEvents to fetch.
     */
    orderBy?: ProfileChangeEventOrderByWithRelationInput | ProfileChangeEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ProfileChangeEvents.
     */
    cursor?: ProfileChangeEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProfileChangeEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProfileChangeEvents.
     */
    skip?: number
    distinct?: ProfileChangeEventScalarFieldEnum | ProfileChangeEventScalarFieldEnum[]
  }

  /**
   * ProfileChangeEvent create
   */
  export type ProfileChangeEventCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProfileChangeEvent
     */
    select?: ProfileChangeEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProfileChangeEvent
     */
    omit?: ProfileChangeEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProfileChangeEventInclude<ExtArgs> | null
    /**
     * The data needed to create a ProfileChangeEvent.
     */
    data: XOR<ProfileChangeEventCreateInput, ProfileChangeEventUncheckedCreateInput>
  }

  /**
   * ProfileChangeEvent createMany
   */
  export type ProfileChangeEventCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ProfileChangeEvents.
     */
    data: ProfileChangeEventCreateManyInput | ProfileChangeEventCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ProfileChangeEvent createManyAndReturn
   */
  export type ProfileChangeEventCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProfileChangeEvent
     */
    select?: ProfileChangeEventSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ProfileChangeEvent
     */
    omit?: ProfileChangeEventOmit<ExtArgs> | null
    /**
     * The data used to create many ProfileChangeEvents.
     */
    data: ProfileChangeEventCreateManyInput | ProfileChangeEventCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProfileChangeEventIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ProfileChangeEvent update
   */
  export type ProfileChangeEventUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProfileChangeEvent
     */
    select?: ProfileChangeEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProfileChangeEvent
     */
    omit?: ProfileChangeEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProfileChangeEventInclude<ExtArgs> | null
    /**
     * The data needed to update a ProfileChangeEvent.
     */
    data: XOR<ProfileChangeEventUpdateInput, ProfileChangeEventUncheckedUpdateInput>
    /**
     * Choose, which ProfileChangeEvent to update.
     */
    where: ProfileChangeEventWhereUniqueInput
  }

  /**
   * ProfileChangeEvent updateMany
   */
  export type ProfileChangeEventUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ProfileChangeEvents.
     */
    data: XOR<ProfileChangeEventUpdateManyMutationInput, ProfileChangeEventUncheckedUpdateManyInput>
    /**
     * Filter which ProfileChangeEvents to update
     */
    where?: ProfileChangeEventWhereInput
    /**
     * Limit how many ProfileChangeEvents to update.
     */
    limit?: number
  }

  /**
   * ProfileChangeEvent updateManyAndReturn
   */
  export type ProfileChangeEventUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProfileChangeEvent
     */
    select?: ProfileChangeEventSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ProfileChangeEvent
     */
    omit?: ProfileChangeEventOmit<ExtArgs> | null
    /**
     * The data used to update ProfileChangeEvents.
     */
    data: XOR<ProfileChangeEventUpdateManyMutationInput, ProfileChangeEventUncheckedUpdateManyInput>
    /**
     * Filter which ProfileChangeEvents to update
     */
    where?: ProfileChangeEventWhereInput
    /**
     * Limit how many ProfileChangeEvents to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProfileChangeEventIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * ProfileChangeEvent upsert
   */
  export type ProfileChangeEventUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProfileChangeEvent
     */
    select?: ProfileChangeEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProfileChangeEvent
     */
    omit?: ProfileChangeEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProfileChangeEventInclude<ExtArgs> | null
    /**
     * The filter to search for the ProfileChangeEvent to update in case it exists.
     */
    where: ProfileChangeEventWhereUniqueInput
    /**
     * In case the ProfileChangeEvent found by the `where` argument doesn't exist, create a new ProfileChangeEvent with this data.
     */
    create: XOR<ProfileChangeEventCreateInput, ProfileChangeEventUncheckedCreateInput>
    /**
     * In case the ProfileChangeEvent was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ProfileChangeEventUpdateInput, ProfileChangeEventUncheckedUpdateInput>
  }

  /**
   * ProfileChangeEvent delete
   */
  export type ProfileChangeEventDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProfileChangeEvent
     */
    select?: ProfileChangeEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProfileChangeEvent
     */
    omit?: ProfileChangeEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProfileChangeEventInclude<ExtArgs> | null
    /**
     * Filter which ProfileChangeEvent to delete.
     */
    where: ProfileChangeEventWhereUniqueInput
  }

  /**
   * ProfileChangeEvent deleteMany
   */
  export type ProfileChangeEventDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ProfileChangeEvents to delete
     */
    where?: ProfileChangeEventWhereInput
    /**
     * Limit how many ProfileChangeEvents to delete.
     */
    limit?: number
  }

  /**
   * ProfileChangeEvent without action
   */
  export type ProfileChangeEventDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProfileChangeEvent
     */
    select?: ProfileChangeEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProfileChangeEvent
     */
    omit?: ProfileChangeEventOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProfileChangeEventInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const EmployeeScalarFieldEnum: {
    id: 'id',
    name: 'name',
    email: 'email',
    position: 'position',
    phone: 'phone',
    photoObjectKey: 'photoObjectKey',
    status: 'status',
    role: 'role',
    passwordHash: 'passwordHash',
    mustChangePassword: 'mustChangePassword',
    authProvider: 'authProvider',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type EmployeeScalarFieldEnum = (typeof EmployeeScalarFieldEnum)[keyof typeof EmployeeScalarFieldEnum]


  export const AttendanceSessionScalarFieldEnum: {
    id: 'id',
    employeeId: 'employeeId',
    workDate: 'workDate',
    clockInAt: 'clockInAt',
    clockOutAt: 'clockOutAt',
    clockInKey: 'clockInKey',
    clockOutKey: 'clockOutKey',
    closedBySystem: 'closedBySystem'
  };

  export type AttendanceSessionScalarFieldEnum = (typeof AttendanceSessionScalarFieldEnum)[keyof typeof AttendanceSessionScalarFieldEnum]


  export const ProfileChangeEventScalarFieldEnum: {
    id: 'id',
    employeeId: 'employeeId',
    actorId: 'actorId',
    actorRole: 'actorRole',
    changedFields: 'changedFields',
    beforeValues: 'beforeValues',
    afterValues: 'afterValues',
    occurredAt: 'occurredAt',
    publishedAt: 'publishedAt'
  };

  export type ProfileChangeEventScalarFieldEnum = (typeof ProfileChangeEventScalarFieldEnum)[keyof typeof ProfileChangeEventScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullableJsonNullValueInput: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull
  };

  export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'EmployeeStatus'
   */
  export type EnumEmployeeStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'EmployeeStatus'>
    


  /**
   * Reference to a field of type 'EmployeeStatus[]'
   */
  export type ListEnumEmployeeStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'EmployeeStatus[]'>
    


  /**
   * Reference to a field of type 'EmployeeRole'
   */
  export type EnumEmployeeRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'EmployeeRole'>
    


  /**
   * Reference to a field of type 'EmployeeRole[]'
   */
  export type ListEnumEmployeeRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'EmployeeRole[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    
  /**
   * Deep Input Types
   */


  export type EmployeeWhereInput = {
    AND?: EmployeeWhereInput | EmployeeWhereInput[]
    OR?: EmployeeWhereInput[]
    NOT?: EmployeeWhereInput | EmployeeWhereInput[]
    id?: UuidFilter<"Employee"> | string
    name?: StringFilter<"Employee"> | string
    email?: StringFilter<"Employee"> | string
    position?: StringFilter<"Employee"> | string
    phone?: StringFilter<"Employee"> | string
    photoObjectKey?: StringNullableFilter<"Employee"> | string | null
    status?: EnumEmployeeStatusFilter<"Employee"> | $Enums.EmployeeStatus
    role?: EnumEmployeeRoleFilter<"Employee"> | $Enums.EmployeeRole
    passwordHash?: StringFilter<"Employee"> | string
    mustChangePassword?: BoolFilter<"Employee"> | boolean
    authProvider?: StringFilter<"Employee"> | string
    createdAt?: DateTimeFilter<"Employee"> | Date | string
    updatedAt?: DateTimeFilter<"Employee"> | Date | string
    attendanceSessions?: AttendanceSessionListRelationFilter
    profileChangeEvents?: ProfileChangeEventListRelationFilter
  }

  export type EmployeeOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    position?: SortOrder
    phone?: SortOrder
    photoObjectKey?: SortOrderInput | SortOrder
    status?: SortOrder
    role?: SortOrder
    passwordHash?: SortOrder
    mustChangePassword?: SortOrder
    authProvider?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    attendanceSessions?: AttendanceSessionOrderByRelationAggregateInput
    profileChangeEvents?: ProfileChangeEventOrderByRelationAggregateInput
  }

  export type EmployeeWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    email?: string
    AND?: EmployeeWhereInput | EmployeeWhereInput[]
    OR?: EmployeeWhereInput[]
    NOT?: EmployeeWhereInput | EmployeeWhereInput[]
    name?: StringFilter<"Employee"> | string
    position?: StringFilter<"Employee"> | string
    phone?: StringFilter<"Employee"> | string
    photoObjectKey?: StringNullableFilter<"Employee"> | string | null
    status?: EnumEmployeeStatusFilter<"Employee"> | $Enums.EmployeeStatus
    role?: EnumEmployeeRoleFilter<"Employee"> | $Enums.EmployeeRole
    passwordHash?: StringFilter<"Employee"> | string
    mustChangePassword?: BoolFilter<"Employee"> | boolean
    authProvider?: StringFilter<"Employee"> | string
    createdAt?: DateTimeFilter<"Employee"> | Date | string
    updatedAt?: DateTimeFilter<"Employee"> | Date | string
    attendanceSessions?: AttendanceSessionListRelationFilter
    profileChangeEvents?: ProfileChangeEventListRelationFilter
  }, "id" | "email">

  export type EmployeeOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    position?: SortOrder
    phone?: SortOrder
    photoObjectKey?: SortOrderInput | SortOrder
    status?: SortOrder
    role?: SortOrder
    passwordHash?: SortOrder
    mustChangePassword?: SortOrder
    authProvider?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: EmployeeCountOrderByAggregateInput
    _max?: EmployeeMaxOrderByAggregateInput
    _min?: EmployeeMinOrderByAggregateInput
  }

  export type EmployeeScalarWhereWithAggregatesInput = {
    AND?: EmployeeScalarWhereWithAggregatesInput | EmployeeScalarWhereWithAggregatesInput[]
    OR?: EmployeeScalarWhereWithAggregatesInput[]
    NOT?: EmployeeScalarWhereWithAggregatesInput | EmployeeScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"Employee"> | string
    name?: StringWithAggregatesFilter<"Employee"> | string
    email?: StringWithAggregatesFilter<"Employee"> | string
    position?: StringWithAggregatesFilter<"Employee"> | string
    phone?: StringWithAggregatesFilter<"Employee"> | string
    photoObjectKey?: StringNullableWithAggregatesFilter<"Employee"> | string | null
    status?: EnumEmployeeStatusWithAggregatesFilter<"Employee"> | $Enums.EmployeeStatus
    role?: EnumEmployeeRoleWithAggregatesFilter<"Employee"> | $Enums.EmployeeRole
    passwordHash?: StringWithAggregatesFilter<"Employee"> | string
    mustChangePassword?: BoolWithAggregatesFilter<"Employee"> | boolean
    authProvider?: StringWithAggregatesFilter<"Employee"> | string
    createdAt?: DateTimeWithAggregatesFilter<"Employee"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Employee"> | Date | string
  }

  export type AttendanceSessionWhereInput = {
    AND?: AttendanceSessionWhereInput | AttendanceSessionWhereInput[]
    OR?: AttendanceSessionWhereInput[]
    NOT?: AttendanceSessionWhereInput | AttendanceSessionWhereInput[]
    id?: UuidFilter<"AttendanceSession"> | string
    employeeId?: UuidFilter<"AttendanceSession"> | string
    workDate?: DateTimeFilter<"AttendanceSession"> | Date | string
    clockInAt?: DateTimeFilter<"AttendanceSession"> | Date | string
    clockOutAt?: DateTimeNullableFilter<"AttendanceSession"> | Date | string | null
    clockInKey?: UuidFilter<"AttendanceSession"> | string
    clockOutKey?: UuidNullableFilter<"AttendanceSession"> | string | null
    closedBySystem?: BoolFilter<"AttendanceSession"> | boolean
    employee?: XOR<EmployeeScalarRelationFilter, EmployeeWhereInput>
  }

  export type AttendanceSessionOrderByWithRelationInput = {
    id?: SortOrder
    employeeId?: SortOrder
    workDate?: SortOrder
    clockInAt?: SortOrder
    clockOutAt?: SortOrderInput | SortOrder
    clockInKey?: SortOrder
    clockOutKey?: SortOrderInput | SortOrder
    closedBySystem?: SortOrder
    employee?: EmployeeOrderByWithRelationInput
  }

  export type AttendanceSessionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    clockInKey?: string
    clockOutKey?: string
    AND?: AttendanceSessionWhereInput | AttendanceSessionWhereInput[]
    OR?: AttendanceSessionWhereInput[]
    NOT?: AttendanceSessionWhereInput | AttendanceSessionWhereInput[]
    employeeId?: UuidFilter<"AttendanceSession"> | string
    workDate?: DateTimeFilter<"AttendanceSession"> | Date | string
    clockInAt?: DateTimeFilter<"AttendanceSession"> | Date | string
    clockOutAt?: DateTimeNullableFilter<"AttendanceSession"> | Date | string | null
    closedBySystem?: BoolFilter<"AttendanceSession"> | boolean
    employee?: XOR<EmployeeScalarRelationFilter, EmployeeWhereInput>
  }, "id" | "clockInKey" | "clockOutKey">

  export type AttendanceSessionOrderByWithAggregationInput = {
    id?: SortOrder
    employeeId?: SortOrder
    workDate?: SortOrder
    clockInAt?: SortOrder
    clockOutAt?: SortOrderInput | SortOrder
    clockInKey?: SortOrder
    clockOutKey?: SortOrderInput | SortOrder
    closedBySystem?: SortOrder
    _count?: AttendanceSessionCountOrderByAggregateInput
    _max?: AttendanceSessionMaxOrderByAggregateInput
    _min?: AttendanceSessionMinOrderByAggregateInput
  }

  export type AttendanceSessionScalarWhereWithAggregatesInput = {
    AND?: AttendanceSessionScalarWhereWithAggregatesInput | AttendanceSessionScalarWhereWithAggregatesInput[]
    OR?: AttendanceSessionScalarWhereWithAggregatesInput[]
    NOT?: AttendanceSessionScalarWhereWithAggregatesInput | AttendanceSessionScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"AttendanceSession"> | string
    employeeId?: UuidWithAggregatesFilter<"AttendanceSession"> | string
    workDate?: DateTimeWithAggregatesFilter<"AttendanceSession"> | Date | string
    clockInAt?: DateTimeWithAggregatesFilter<"AttendanceSession"> | Date | string
    clockOutAt?: DateTimeNullableWithAggregatesFilter<"AttendanceSession"> | Date | string | null
    clockInKey?: UuidWithAggregatesFilter<"AttendanceSession"> | string
    clockOutKey?: UuidNullableWithAggregatesFilter<"AttendanceSession"> | string | null
    closedBySystem?: BoolWithAggregatesFilter<"AttendanceSession"> | boolean
  }

  export type ProfileChangeEventWhereInput = {
    AND?: ProfileChangeEventWhereInput | ProfileChangeEventWhereInput[]
    OR?: ProfileChangeEventWhereInput[]
    NOT?: ProfileChangeEventWhereInput | ProfileChangeEventWhereInput[]
    id?: UuidFilter<"ProfileChangeEvent"> | string
    employeeId?: UuidFilter<"ProfileChangeEvent"> | string
    actorId?: UuidFilter<"ProfileChangeEvent"> | string
    actorRole?: EnumEmployeeRoleFilter<"ProfileChangeEvent"> | $Enums.EmployeeRole
    changedFields?: StringNullableListFilter<"ProfileChangeEvent">
    beforeValues?: JsonNullableFilter<"ProfileChangeEvent">
    afterValues?: JsonNullableFilter<"ProfileChangeEvent">
    occurredAt?: DateTimeFilter<"ProfileChangeEvent"> | Date | string
    publishedAt?: DateTimeNullableFilter<"ProfileChangeEvent"> | Date | string | null
    employee?: XOR<EmployeeScalarRelationFilter, EmployeeWhereInput>
  }

  export type ProfileChangeEventOrderByWithRelationInput = {
    id?: SortOrder
    employeeId?: SortOrder
    actorId?: SortOrder
    actorRole?: SortOrder
    changedFields?: SortOrder
    beforeValues?: SortOrderInput | SortOrder
    afterValues?: SortOrderInput | SortOrder
    occurredAt?: SortOrder
    publishedAt?: SortOrderInput | SortOrder
    employee?: EmployeeOrderByWithRelationInput
  }

  export type ProfileChangeEventWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ProfileChangeEventWhereInput | ProfileChangeEventWhereInput[]
    OR?: ProfileChangeEventWhereInput[]
    NOT?: ProfileChangeEventWhereInput | ProfileChangeEventWhereInput[]
    employeeId?: UuidFilter<"ProfileChangeEvent"> | string
    actorId?: UuidFilter<"ProfileChangeEvent"> | string
    actorRole?: EnumEmployeeRoleFilter<"ProfileChangeEvent"> | $Enums.EmployeeRole
    changedFields?: StringNullableListFilter<"ProfileChangeEvent">
    beforeValues?: JsonNullableFilter<"ProfileChangeEvent">
    afterValues?: JsonNullableFilter<"ProfileChangeEvent">
    occurredAt?: DateTimeFilter<"ProfileChangeEvent"> | Date | string
    publishedAt?: DateTimeNullableFilter<"ProfileChangeEvent"> | Date | string | null
    employee?: XOR<EmployeeScalarRelationFilter, EmployeeWhereInput>
  }, "id">

  export type ProfileChangeEventOrderByWithAggregationInput = {
    id?: SortOrder
    employeeId?: SortOrder
    actorId?: SortOrder
    actorRole?: SortOrder
    changedFields?: SortOrder
    beforeValues?: SortOrderInput | SortOrder
    afterValues?: SortOrderInput | SortOrder
    occurredAt?: SortOrder
    publishedAt?: SortOrderInput | SortOrder
    _count?: ProfileChangeEventCountOrderByAggregateInput
    _max?: ProfileChangeEventMaxOrderByAggregateInput
    _min?: ProfileChangeEventMinOrderByAggregateInput
  }

  export type ProfileChangeEventScalarWhereWithAggregatesInput = {
    AND?: ProfileChangeEventScalarWhereWithAggregatesInput | ProfileChangeEventScalarWhereWithAggregatesInput[]
    OR?: ProfileChangeEventScalarWhereWithAggregatesInput[]
    NOT?: ProfileChangeEventScalarWhereWithAggregatesInput | ProfileChangeEventScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"ProfileChangeEvent"> | string
    employeeId?: UuidWithAggregatesFilter<"ProfileChangeEvent"> | string
    actorId?: UuidWithAggregatesFilter<"ProfileChangeEvent"> | string
    actorRole?: EnumEmployeeRoleWithAggregatesFilter<"ProfileChangeEvent"> | $Enums.EmployeeRole
    changedFields?: StringNullableListFilter<"ProfileChangeEvent">
    beforeValues?: JsonNullableWithAggregatesFilter<"ProfileChangeEvent">
    afterValues?: JsonNullableWithAggregatesFilter<"ProfileChangeEvent">
    occurredAt?: DateTimeWithAggregatesFilter<"ProfileChangeEvent"> | Date | string
    publishedAt?: DateTimeNullableWithAggregatesFilter<"ProfileChangeEvent"> | Date | string | null
  }

  export type EmployeeCreateInput = {
    id?: string
    name: string
    email: string
    position: string
    phone: string
    photoObjectKey?: string | null
    status?: $Enums.EmployeeStatus
    role: $Enums.EmployeeRole
    passwordHash: string
    mustChangePassword?: boolean
    authProvider?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    attendanceSessions?: AttendanceSessionCreateNestedManyWithoutEmployeeInput
    profileChangeEvents?: ProfileChangeEventCreateNestedManyWithoutEmployeeInput
  }

  export type EmployeeUncheckedCreateInput = {
    id?: string
    name: string
    email: string
    position: string
    phone: string
    photoObjectKey?: string | null
    status?: $Enums.EmployeeStatus
    role: $Enums.EmployeeRole
    passwordHash: string
    mustChangePassword?: boolean
    authProvider?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    attendanceSessions?: AttendanceSessionUncheckedCreateNestedManyWithoutEmployeeInput
    profileChangeEvents?: ProfileChangeEventUncheckedCreateNestedManyWithoutEmployeeInput
  }

  export type EmployeeUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    position?: StringFieldUpdateOperationsInput | string
    phone?: StringFieldUpdateOperationsInput | string
    photoObjectKey?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumEmployeeStatusFieldUpdateOperationsInput | $Enums.EmployeeStatus
    role?: EnumEmployeeRoleFieldUpdateOperationsInput | $Enums.EmployeeRole
    passwordHash?: StringFieldUpdateOperationsInput | string
    mustChangePassword?: BoolFieldUpdateOperationsInput | boolean
    authProvider?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    attendanceSessions?: AttendanceSessionUpdateManyWithoutEmployeeNestedInput
    profileChangeEvents?: ProfileChangeEventUpdateManyWithoutEmployeeNestedInput
  }

  export type EmployeeUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    position?: StringFieldUpdateOperationsInput | string
    phone?: StringFieldUpdateOperationsInput | string
    photoObjectKey?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumEmployeeStatusFieldUpdateOperationsInput | $Enums.EmployeeStatus
    role?: EnumEmployeeRoleFieldUpdateOperationsInput | $Enums.EmployeeRole
    passwordHash?: StringFieldUpdateOperationsInput | string
    mustChangePassword?: BoolFieldUpdateOperationsInput | boolean
    authProvider?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    attendanceSessions?: AttendanceSessionUncheckedUpdateManyWithoutEmployeeNestedInput
    profileChangeEvents?: ProfileChangeEventUncheckedUpdateManyWithoutEmployeeNestedInput
  }

  export type EmployeeCreateManyInput = {
    id?: string
    name: string
    email: string
    position: string
    phone: string
    photoObjectKey?: string | null
    status?: $Enums.EmployeeStatus
    role: $Enums.EmployeeRole
    passwordHash: string
    mustChangePassword?: boolean
    authProvider?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type EmployeeUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    position?: StringFieldUpdateOperationsInput | string
    phone?: StringFieldUpdateOperationsInput | string
    photoObjectKey?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumEmployeeStatusFieldUpdateOperationsInput | $Enums.EmployeeStatus
    role?: EnumEmployeeRoleFieldUpdateOperationsInput | $Enums.EmployeeRole
    passwordHash?: StringFieldUpdateOperationsInput | string
    mustChangePassword?: BoolFieldUpdateOperationsInput | boolean
    authProvider?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EmployeeUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    position?: StringFieldUpdateOperationsInput | string
    phone?: StringFieldUpdateOperationsInput | string
    photoObjectKey?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumEmployeeStatusFieldUpdateOperationsInput | $Enums.EmployeeStatus
    role?: EnumEmployeeRoleFieldUpdateOperationsInput | $Enums.EmployeeRole
    passwordHash?: StringFieldUpdateOperationsInput | string
    mustChangePassword?: BoolFieldUpdateOperationsInput | boolean
    authProvider?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AttendanceSessionCreateInput = {
    id?: string
    workDate: Date | string
    clockInAt: Date | string
    clockOutAt?: Date | string | null
    clockInKey: string
    clockOutKey?: string | null
    closedBySystem?: boolean
    employee: EmployeeCreateNestedOneWithoutAttendanceSessionsInput
  }

  export type AttendanceSessionUncheckedCreateInput = {
    id?: string
    employeeId: string
    workDate: Date | string
    clockInAt: Date | string
    clockOutAt?: Date | string | null
    clockInKey: string
    clockOutKey?: string | null
    closedBySystem?: boolean
  }

  export type AttendanceSessionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    workDate?: DateTimeFieldUpdateOperationsInput | Date | string
    clockInAt?: DateTimeFieldUpdateOperationsInput | Date | string
    clockOutAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    clockInKey?: StringFieldUpdateOperationsInput | string
    clockOutKey?: NullableStringFieldUpdateOperationsInput | string | null
    closedBySystem?: BoolFieldUpdateOperationsInput | boolean
    employee?: EmployeeUpdateOneRequiredWithoutAttendanceSessionsNestedInput
  }

  export type AttendanceSessionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    employeeId?: StringFieldUpdateOperationsInput | string
    workDate?: DateTimeFieldUpdateOperationsInput | Date | string
    clockInAt?: DateTimeFieldUpdateOperationsInput | Date | string
    clockOutAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    clockInKey?: StringFieldUpdateOperationsInput | string
    clockOutKey?: NullableStringFieldUpdateOperationsInput | string | null
    closedBySystem?: BoolFieldUpdateOperationsInput | boolean
  }

  export type AttendanceSessionCreateManyInput = {
    id?: string
    employeeId: string
    workDate: Date | string
    clockInAt: Date | string
    clockOutAt?: Date | string | null
    clockInKey: string
    clockOutKey?: string | null
    closedBySystem?: boolean
  }

  export type AttendanceSessionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    workDate?: DateTimeFieldUpdateOperationsInput | Date | string
    clockInAt?: DateTimeFieldUpdateOperationsInput | Date | string
    clockOutAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    clockInKey?: StringFieldUpdateOperationsInput | string
    clockOutKey?: NullableStringFieldUpdateOperationsInput | string | null
    closedBySystem?: BoolFieldUpdateOperationsInput | boolean
  }

  export type AttendanceSessionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    employeeId?: StringFieldUpdateOperationsInput | string
    workDate?: DateTimeFieldUpdateOperationsInput | Date | string
    clockInAt?: DateTimeFieldUpdateOperationsInput | Date | string
    clockOutAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    clockInKey?: StringFieldUpdateOperationsInput | string
    clockOutKey?: NullableStringFieldUpdateOperationsInput | string | null
    closedBySystem?: BoolFieldUpdateOperationsInput | boolean
  }

  export type ProfileChangeEventCreateInput = {
    id?: string
    actorId: string
    actorRole: $Enums.EmployeeRole
    changedFields?: ProfileChangeEventCreatechangedFieldsInput | string[]
    beforeValues?: NullableJsonNullValueInput | InputJsonValue
    afterValues?: NullableJsonNullValueInput | InputJsonValue
    occurredAt?: Date | string
    publishedAt?: Date | string | null
    employee: EmployeeCreateNestedOneWithoutProfileChangeEventsInput
  }

  export type ProfileChangeEventUncheckedCreateInput = {
    id?: string
    employeeId: string
    actorId: string
    actorRole: $Enums.EmployeeRole
    changedFields?: ProfileChangeEventCreatechangedFieldsInput | string[]
    beforeValues?: NullableJsonNullValueInput | InputJsonValue
    afterValues?: NullableJsonNullValueInput | InputJsonValue
    occurredAt?: Date | string
    publishedAt?: Date | string | null
  }

  export type ProfileChangeEventUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    actorId?: StringFieldUpdateOperationsInput | string
    actorRole?: EnumEmployeeRoleFieldUpdateOperationsInput | $Enums.EmployeeRole
    changedFields?: ProfileChangeEventUpdatechangedFieldsInput | string[]
    beforeValues?: NullableJsonNullValueInput | InputJsonValue
    afterValues?: NullableJsonNullValueInput | InputJsonValue
    occurredAt?: DateTimeFieldUpdateOperationsInput | Date | string
    publishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    employee?: EmployeeUpdateOneRequiredWithoutProfileChangeEventsNestedInput
  }

  export type ProfileChangeEventUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    employeeId?: StringFieldUpdateOperationsInput | string
    actorId?: StringFieldUpdateOperationsInput | string
    actorRole?: EnumEmployeeRoleFieldUpdateOperationsInput | $Enums.EmployeeRole
    changedFields?: ProfileChangeEventUpdatechangedFieldsInput | string[]
    beforeValues?: NullableJsonNullValueInput | InputJsonValue
    afterValues?: NullableJsonNullValueInput | InputJsonValue
    occurredAt?: DateTimeFieldUpdateOperationsInput | Date | string
    publishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type ProfileChangeEventCreateManyInput = {
    id?: string
    employeeId: string
    actorId: string
    actorRole: $Enums.EmployeeRole
    changedFields?: ProfileChangeEventCreatechangedFieldsInput | string[]
    beforeValues?: NullableJsonNullValueInput | InputJsonValue
    afterValues?: NullableJsonNullValueInput | InputJsonValue
    occurredAt?: Date | string
    publishedAt?: Date | string | null
  }

  export type ProfileChangeEventUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    actorId?: StringFieldUpdateOperationsInput | string
    actorRole?: EnumEmployeeRoleFieldUpdateOperationsInput | $Enums.EmployeeRole
    changedFields?: ProfileChangeEventUpdatechangedFieldsInput | string[]
    beforeValues?: NullableJsonNullValueInput | InputJsonValue
    afterValues?: NullableJsonNullValueInput | InputJsonValue
    occurredAt?: DateTimeFieldUpdateOperationsInput | Date | string
    publishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type ProfileChangeEventUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    employeeId?: StringFieldUpdateOperationsInput | string
    actorId?: StringFieldUpdateOperationsInput | string
    actorRole?: EnumEmployeeRoleFieldUpdateOperationsInput | $Enums.EmployeeRole
    changedFields?: ProfileChangeEventUpdatechangedFieldsInput | string[]
    beforeValues?: NullableJsonNullValueInput | InputJsonValue
    afterValues?: NullableJsonNullValueInput | InputJsonValue
    occurredAt?: DateTimeFieldUpdateOperationsInput | Date | string
    publishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type UuidFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidFilter<$PrismaModel> | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type EnumEmployeeStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.EmployeeStatus | EnumEmployeeStatusFieldRefInput<$PrismaModel>
    in?: $Enums.EmployeeStatus[] | ListEnumEmployeeStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.EmployeeStatus[] | ListEnumEmployeeStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumEmployeeStatusFilter<$PrismaModel> | $Enums.EmployeeStatus
  }

  export type EnumEmployeeRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.EmployeeRole | EnumEmployeeRoleFieldRefInput<$PrismaModel>
    in?: $Enums.EmployeeRole[] | ListEnumEmployeeRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.EmployeeRole[] | ListEnumEmployeeRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumEmployeeRoleFilter<$PrismaModel> | $Enums.EmployeeRole
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type AttendanceSessionListRelationFilter = {
    every?: AttendanceSessionWhereInput
    some?: AttendanceSessionWhereInput
    none?: AttendanceSessionWhereInput
  }

  export type ProfileChangeEventListRelationFilter = {
    every?: ProfileChangeEventWhereInput
    some?: ProfileChangeEventWhereInput
    none?: ProfileChangeEventWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type AttendanceSessionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ProfileChangeEventOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type EmployeeCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    position?: SortOrder
    phone?: SortOrder
    photoObjectKey?: SortOrder
    status?: SortOrder
    role?: SortOrder
    passwordHash?: SortOrder
    mustChangePassword?: SortOrder
    authProvider?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type EmployeeMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    position?: SortOrder
    phone?: SortOrder
    photoObjectKey?: SortOrder
    status?: SortOrder
    role?: SortOrder
    passwordHash?: SortOrder
    mustChangePassword?: SortOrder
    authProvider?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type EmployeeMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    position?: SortOrder
    phone?: SortOrder
    photoObjectKey?: SortOrder
    status?: SortOrder
    role?: SortOrder
    passwordHash?: SortOrder
    mustChangePassword?: SortOrder
    authProvider?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UuidWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type EnumEmployeeStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EmployeeStatus | EnumEmployeeStatusFieldRefInput<$PrismaModel>
    in?: $Enums.EmployeeStatus[] | ListEnumEmployeeStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.EmployeeStatus[] | ListEnumEmployeeStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumEmployeeStatusWithAggregatesFilter<$PrismaModel> | $Enums.EmployeeStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEmployeeStatusFilter<$PrismaModel>
    _max?: NestedEnumEmployeeStatusFilter<$PrismaModel>
  }

  export type EnumEmployeeRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EmployeeRole | EnumEmployeeRoleFieldRefInput<$PrismaModel>
    in?: $Enums.EmployeeRole[] | ListEnumEmployeeRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.EmployeeRole[] | ListEnumEmployeeRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumEmployeeRoleWithAggregatesFilter<$PrismaModel> | $Enums.EmployeeRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEmployeeRoleFilter<$PrismaModel>
    _max?: NestedEnumEmployeeRoleFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type UuidNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidNullableFilter<$PrismaModel> | string | null
  }

  export type EmployeeScalarRelationFilter = {
    is?: EmployeeWhereInput
    isNot?: EmployeeWhereInput
  }

  export type AttendanceSessionCountOrderByAggregateInput = {
    id?: SortOrder
    employeeId?: SortOrder
    workDate?: SortOrder
    clockInAt?: SortOrder
    clockOutAt?: SortOrder
    clockInKey?: SortOrder
    clockOutKey?: SortOrder
    closedBySystem?: SortOrder
  }

  export type AttendanceSessionMaxOrderByAggregateInput = {
    id?: SortOrder
    employeeId?: SortOrder
    workDate?: SortOrder
    clockInAt?: SortOrder
    clockOutAt?: SortOrder
    clockInKey?: SortOrder
    clockOutKey?: SortOrder
    closedBySystem?: SortOrder
  }

  export type AttendanceSessionMinOrderByAggregateInput = {
    id?: SortOrder
    employeeId?: SortOrder
    workDate?: SortOrder
    clockInAt?: SortOrder
    clockOutAt?: SortOrder
    clockInKey?: SortOrder
    clockOutKey?: SortOrder
    closedBySystem?: SortOrder
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type UuidNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type StringNullableListFilter<$PrismaModel = never> = {
    equals?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    has?: string | StringFieldRefInput<$PrismaModel> | null
    hasEvery?: string[] | ListStringFieldRefInput<$PrismaModel>
    hasSome?: string[] | ListStringFieldRefInput<$PrismaModel>
    isEmpty?: boolean
  }
  export type JsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type ProfileChangeEventCountOrderByAggregateInput = {
    id?: SortOrder
    employeeId?: SortOrder
    actorId?: SortOrder
    actorRole?: SortOrder
    changedFields?: SortOrder
    beforeValues?: SortOrder
    afterValues?: SortOrder
    occurredAt?: SortOrder
    publishedAt?: SortOrder
  }

  export type ProfileChangeEventMaxOrderByAggregateInput = {
    id?: SortOrder
    employeeId?: SortOrder
    actorId?: SortOrder
    actorRole?: SortOrder
    occurredAt?: SortOrder
    publishedAt?: SortOrder
  }

  export type ProfileChangeEventMinOrderByAggregateInput = {
    id?: SortOrder
    employeeId?: SortOrder
    actorId?: SortOrder
    actorRole?: SortOrder
    occurredAt?: SortOrder
    publishedAt?: SortOrder
  }
  export type JsonNullableWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedJsonNullableFilter<$PrismaModel>
    _max?: NestedJsonNullableFilter<$PrismaModel>
  }

  export type AttendanceSessionCreateNestedManyWithoutEmployeeInput = {
    create?: XOR<AttendanceSessionCreateWithoutEmployeeInput, AttendanceSessionUncheckedCreateWithoutEmployeeInput> | AttendanceSessionCreateWithoutEmployeeInput[] | AttendanceSessionUncheckedCreateWithoutEmployeeInput[]
    connectOrCreate?: AttendanceSessionCreateOrConnectWithoutEmployeeInput | AttendanceSessionCreateOrConnectWithoutEmployeeInput[]
    createMany?: AttendanceSessionCreateManyEmployeeInputEnvelope
    connect?: AttendanceSessionWhereUniqueInput | AttendanceSessionWhereUniqueInput[]
  }

  export type ProfileChangeEventCreateNestedManyWithoutEmployeeInput = {
    create?: XOR<ProfileChangeEventCreateWithoutEmployeeInput, ProfileChangeEventUncheckedCreateWithoutEmployeeInput> | ProfileChangeEventCreateWithoutEmployeeInput[] | ProfileChangeEventUncheckedCreateWithoutEmployeeInput[]
    connectOrCreate?: ProfileChangeEventCreateOrConnectWithoutEmployeeInput | ProfileChangeEventCreateOrConnectWithoutEmployeeInput[]
    createMany?: ProfileChangeEventCreateManyEmployeeInputEnvelope
    connect?: ProfileChangeEventWhereUniqueInput | ProfileChangeEventWhereUniqueInput[]
  }

  export type AttendanceSessionUncheckedCreateNestedManyWithoutEmployeeInput = {
    create?: XOR<AttendanceSessionCreateWithoutEmployeeInput, AttendanceSessionUncheckedCreateWithoutEmployeeInput> | AttendanceSessionCreateWithoutEmployeeInput[] | AttendanceSessionUncheckedCreateWithoutEmployeeInput[]
    connectOrCreate?: AttendanceSessionCreateOrConnectWithoutEmployeeInput | AttendanceSessionCreateOrConnectWithoutEmployeeInput[]
    createMany?: AttendanceSessionCreateManyEmployeeInputEnvelope
    connect?: AttendanceSessionWhereUniqueInput | AttendanceSessionWhereUniqueInput[]
  }

  export type ProfileChangeEventUncheckedCreateNestedManyWithoutEmployeeInput = {
    create?: XOR<ProfileChangeEventCreateWithoutEmployeeInput, ProfileChangeEventUncheckedCreateWithoutEmployeeInput> | ProfileChangeEventCreateWithoutEmployeeInput[] | ProfileChangeEventUncheckedCreateWithoutEmployeeInput[]
    connectOrCreate?: ProfileChangeEventCreateOrConnectWithoutEmployeeInput | ProfileChangeEventCreateOrConnectWithoutEmployeeInput[]
    createMany?: ProfileChangeEventCreateManyEmployeeInputEnvelope
    connect?: ProfileChangeEventWhereUniqueInput | ProfileChangeEventWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type EnumEmployeeStatusFieldUpdateOperationsInput = {
    set?: $Enums.EmployeeStatus
  }

  export type EnumEmployeeRoleFieldUpdateOperationsInput = {
    set?: $Enums.EmployeeRole
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type AttendanceSessionUpdateManyWithoutEmployeeNestedInput = {
    create?: XOR<AttendanceSessionCreateWithoutEmployeeInput, AttendanceSessionUncheckedCreateWithoutEmployeeInput> | AttendanceSessionCreateWithoutEmployeeInput[] | AttendanceSessionUncheckedCreateWithoutEmployeeInput[]
    connectOrCreate?: AttendanceSessionCreateOrConnectWithoutEmployeeInput | AttendanceSessionCreateOrConnectWithoutEmployeeInput[]
    upsert?: AttendanceSessionUpsertWithWhereUniqueWithoutEmployeeInput | AttendanceSessionUpsertWithWhereUniqueWithoutEmployeeInput[]
    createMany?: AttendanceSessionCreateManyEmployeeInputEnvelope
    set?: AttendanceSessionWhereUniqueInput | AttendanceSessionWhereUniqueInput[]
    disconnect?: AttendanceSessionWhereUniqueInput | AttendanceSessionWhereUniqueInput[]
    delete?: AttendanceSessionWhereUniqueInput | AttendanceSessionWhereUniqueInput[]
    connect?: AttendanceSessionWhereUniqueInput | AttendanceSessionWhereUniqueInput[]
    update?: AttendanceSessionUpdateWithWhereUniqueWithoutEmployeeInput | AttendanceSessionUpdateWithWhereUniqueWithoutEmployeeInput[]
    updateMany?: AttendanceSessionUpdateManyWithWhereWithoutEmployeeInput | AttendanceSessionUpdateManyWithWhereWithoutEmployeeInput[]
    deleteMany?: AttendanceSessionScalarWhereInput | AttendanceSessionScalarWhereInput[]
  }

  export type ProfileChangeEventUpdateManyWithoutEmployeeNestedInput = {
    create?: XOR<ProfileChangeEventCreateWithoutEmployeeInput, ProfileChangeEventUncheckedCreateWithoutEmployeeInput> | ProfileChangeEventCreateWithoutEmployeeInput[] | ProfileChangeEventUncheckedCreateWithoutEmployeeInput[]
    connectOrCreate?: ProfileChangeEventCreateOrConnectWithoutEmployeeInput | ProfileChangeEventCreateOrConnectWithoutEmployeeInput[]
    upsert?: ProfileChangeEventUpsertWithWhereUniqueWithoutEmployeeInput | ProfileChangeEventUpsertWithWhereUniqueWithoutEmployeeInput[]
    createMany?: ProfileChangeEventCreateManyEmployeeInputEnvelope
    set?: ProfileChangeEventWhereUniqueInput | ProfileChangeEventWhereUniqueInput[]
    disconnect?: ProfileChangeEventWhereUniqueInput | ProfileChangeEventWhereUniqueInput[]
    delete?: ProfileChangeEventWhereUniqueInput | ProfileChangeEventWhereUniqueInput[]
    connect?: ProfileChangeEventWhereUniqueInput | ProfileChangeEventWhereUniqueInput[]
    update?: ProfileChangeEventUpdateWithWhereUniqueWithoutEmployeeInput | ProfileChangeEventUpdateWithWhereUniqueWithoutEmployeeInput[]
    updateMany?: ProfileChangeEventUpdateManyWithWhereWithoutEmployeeInput | ProfileChangeEventUpdateManyWithWhereWithoutEmployeeInput[]
    deleteMany?: ProfileChangeEventScalarWhereInput | ProfileChangeEventScalarWhereInput[]
  }

  export type AttendanceSessionUncheckedUpdateManyWithoutEmployeeNestedInput = {
    create?: XOR<AttendanceSessionCreateWithoutEmployeeInput, AttendanceSessionUncheckedCreateWithoutEmployeeInput> | AttendanceSessionCreateWithoutEmployeeInput[] | AttendanceSessionUncheckedCreateWithoutEmployeeInput[]
    connectOrCreate?: AttendanceSessionCreateOrConnectWithoutEmployeeInput | AttendanceSessionCreateOrConnectWithoutEmployeeInput[]
    upsert?: AttendanceSessionUpsertWithWhereUniqueWithoutEmployeeInput | AttendanceSessionUpsertWithWhereUniqueWithoutEmployeeInput[]
    createMany?: AttendanceSessionCreateManyEmployeeInputEnvelope
    set?: AttendanceSessionWhereUniqueInput | AttendanceSessionWhereUniqueInput[]
    disconnect?: AttendanceSessionWhereUniqueInput | AttendanceSessionWhereUniqueInput[]
    delete?: AttendanceSessionWhereUniqueInput | AttendanceSessionWhereUniqueInput[]
    connect?: AttendanceSessionWhereUniqueInput | AttendanceSessionWhereUniqueInput[]
    update?: AttendanceSessionUpdateWithWhereUniqueWithoutEmployeeInput | AttendanceSessionUpdateWithWhereUniqueWithoutEmployeeInput[]
    updateMany?: AttendanceSessionUpdateManyWithWhereWithoutEmployeeInput | AttendanceSessionUpdateManyWithWhereWithoutEmployeeInput[]
    deleteMany?: AttendanceSessionScalarWhereInput | AttendanceSessionScalarWhereInput[]
  }

  export type ProfileChangeEventUncheckedUpdateManyWithoutEmployeeNestedInput = {
    create?: XOR<ProfileChangeEventCreateWithoutEmployeeInput, ProfileChangeEventUncheckedCreateWithoutEmployeeInput> | ProfileChangeEventCreateWithoutEmployeeInput[] | ProfileChangeEventUncheckedCreateWithoutEmployeeInput[]
    connectOrCreate?: ProfileChangeEventCreateOrConnectWithoutEmployeeInput | ProfileChangeEventCreateOrConnectWithoutEmployeeInput[]
    upsert?: ProfileChangeEventUpsertWithWhereUniqueWithoutEmployeeInput | ProfileChangeEventUpsertWithWhereUniqueWithoutEmployeeInput[]
    createMany?: ProfileChangeEventCreateManyEmployeeInputEnvelope
    set?: ProfileChangeEventWhereUniqueInput | ProfileChangeEventWhereUniqueInput[]
    disconnect?: ProfileChangeEventWhereUniqueInput | ProfileChangeEventWhereUniqueInput[]
    delete?: ProfileChangeEventWhereUniqueInput | ProfileChangeEventWhereUniqueInput[]
    connect?: ProfileChangeEventWhereUniqueInput | ProfileChangeEventWhereUniqueInput[]
    update?: ProfileChangeEventUpdateWithWhereUniqueWithoutEmployeeInput | ProfileChangeEventUpdateWithWhereUniqueWithoutEmployeeInput[]
    updateMany?: ProfileChangeEventUpdateManyWithWhereWithoutEmployeeInput | ProfileChangeEventUpdateManyWithWhereWithoutEmployeeInput[]
    deleteMany?: ProfileChangeEventScalarWhereInput | ProfileChangeEventScalarWhereInput[]
  }

  export type EmployeeCreateNestedOneWithoutAttendanceSessionsInput = {
    create?: XOR<EmployeeCreateWithoutAttendanceSessionsInput, EmployeeUncheckedCreateWithoutAttendanceSessionsInput>
    connectOrCreate?: EmployeeCreateOrConnectWithoutAttendanceSessionsInput
    connect?: EmployeeWhereUniqueInput
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type EmployeeUpdateOneRequiredWithoutAttendanceSessionsNestedInput = {
    create?: XOR<EmployeeCreateWithoutAttendanceSessionsInput, EmployeeUncheckedCreateWithoutAttendanceSessionsInput>
    connectOrCreate?: EmployeeCreateOrConnectWithoutAttendanceSessionsInput
    upsert?: EmployeeUpsertWithoutAttendanceSessionsInput
    connect?: EmployeeWhereUniqueInput
    update?: XOR<XOR<EmployeeUpdateToOneWithWhereWithoutAttendanceSessionsInput, EmployeeUpdateWithoutAttendanceSessionsInput>, EmployeeUncheckedUpdateWithoutAttendanceSessionsInput>
  }

  export type ProfileChangeEventCreatechangedFieldsInput = {
    set: string[]
  }

  export type EmployeeCreateNestedOneWithoutProfileChangeEventsInput = {
    create?: XOR<EmployeeCreateWithoutProfileChangeEventsInput, EmployeeUncheckedCreateWithoutProfileChangeEventsInput>
    connectOrCreate?: EmployeeCreateOrConnectWithoutProfileChangeEventsInput
    connect?: EmployeeWhereUniqueInput
  }

  export type ProfileChangeEventUpdatechangedFieldsInput = {
    set?: string[]
    push?: string | string[]
  }

  export type EmployeeUpdateOneRequiredWithoutProfileChangeEventsNestedInput = {
    create?: XOR<EmployeeCreateWithoutProfileChangeEventsInput, EmployeeUncheckedCreateWithoutProfileChangeEventsInput>
    connectOrCreate?: EmployeeCreateOrConnectWithoutProfileChangeEventsInput
    upsert?: EmployeeUpsertWithoutProfileChangeEventsInput
    connect?: EmployeeWhereUniqueInput
    update?: XOR<XOR<EmployeeUpdateToOneWithWhereWithoutProfileChangeEventsInput, EmployeeUpdateWithoutProfileChangeEventsInput>, EmployeeUncheckedUpdateWithoutProfileChangeEventsInput>
  }

  export type NestedUuidFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidFilter<$PrismaModel> | string
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedEnumEmployeeStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.EmployeeStatus | EnumEmployeeStatusFieldRefInput<$PrismaModel>
    in?: $Enums.EmployeeStatus[] | ListEnumEmployeeStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.EmployeeStatus[] | ListEnumEmployeeStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumEmployeeStatusFilter<$PrismaModel> | $Enums.EmployeeStatus
  }

  export type NestedEnumEmployeeRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.EmployeeRole | EnumEmployeeRoleFieldRefInput<$PrismaModel>
    in?: $Enums.EmployeeRole[] | ListEnumEmployeeRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.EmployeeRole[] | ListEnumEmployeeRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumEmployeeRoleFilter<$PrismaModel> | $Enums.EmployeeRole
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedUuidWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedEnumEmployeeStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EmployeeStatus | EnumEmployeeStatusFieldRefInput<$PrismaModel>
    in?: $Enums.EmployeeStatus[] | ListEnumEmployeeStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.EmployeeStatus[] | ListEnumEmployeeStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumEmployeeStatusWithAggregatesFilter<$PrismaModel> | $Enums.EmployeeStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEmployeeStatusFilter<$PrismaModel>
    _max?: NestedEnumEmployeeStatusFilter<$PrismaModel>
  }

  export type NestedEnumEmployeeRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EmployeeRole | EnumEmployeeRoleFieldRefInput<$PrismaModel>
    in?: $Enums.EmployeeRole[] | ListEnumEmployeeRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.EmployeeRole[] | ListEnumEmployeeRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumEmployeeRoleWithAggregatesFilter<$PrismaModel> | $Enums.EmployeeRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEmployeeRoleFilter<$PrismaModel>
    _max?: NestedEnumEmployeeRoleFilter<$PrismaModel>
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedUuidNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidNullableFilter<$PrismaModel> | string | null
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedUuidNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }
  export type NestedJsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type AttendanceSessionCreateWithoutEmployeeInput = {
    id?: string
    workDate: Date | string
    clockInAt: Date | string
    clockOutAt?: Date | string | null
    clockInKey: string
    clockOutKey?: string | null
    closedBySystem?: boolean
  }

  export type AttendanceSessionUncheckedCreateWithoutEmployeeInput = {
    id?: string
    workDate: Date | string
    clockInAt: Date | string
    clockOutAt?: Date | string | null
    clockInKey: string
    clockOutKey?: string | null
    closedBySystem?: boolean
  }

  export type AttendanceSessionCreateOrConnectWithoutEmployeeInput = {
    where: AttendanceSessionWhereUniqueInput
    create: XOR<AttendanceSessionCreateWithoutEmployeeInput, AttendanceSessionUncheckedCreateWithoutEmployeeInput>
  }

  export type AttendanceSessionCreateManyEmployeeInputEnvelope = {
    data: AttendanceSessionCreateManyEmployeeInput | AttendanceSessionCreateManyEmployeeInput[]
    skipDuplicates?: boolean
  }

  export type ProfileChangeEventCreateWithoutEmployeeInput = {
    id?: string
    actorId: string
    actorRole: $Enums.EmployeeRole
    changedFields?: ProfileChangeEventCreatechangedFieldsInput | string[]
    beforeValues?: NullableJsonNullValueInput | InputJsonValue
    afterValues?: NullableJsonNullValueInput | InputJsonValue
    occurredAt?: Date | string
    publishedAt?: Date | string | null
  }

  export type ProfileChangeEventUncheckedCreateWithoutEmployeeInput = {
    id?: string
    actorId: string
    actorRole: $Enums.EmployeeRole
    changedFields?: ProfileChangeEventCreatechangedFieldsInput | string[]
    beforeValues?: NullableJsonNullValueInput | InputJsonValue
    afterValues?: NullableJsonNullValueInput | InputJsonValue
    occurredAt?: Date | string
    publishedAt?: Date | string | null
  }

  export type ProfileChangeEventCreateOrConnectWithoutEmployeeInput = {
    where: ProfileChangeEventWhereUniqueInput
    create: XOR<ProfileChangeEventCreateWithoutEmployeeInput, ProfileChangeEventUncheckedCreateWithoutEmployeeInput>
  }

  export type ProfileChangeEventCreateManyEmployeeInputEnvelope = {
    data: ProfileChangeEventCreateManyEmployeeInput | ProfileChangeEventCreateManyEmployeeInput[]
    skipDuplicates?: boolean
  }

  export type AttendanceSessionUpsertWithWhereUniqueWithoutEmployeeInput = {
    where: AttendanceSessionWhereUniqueInput
    update: XOR<AttendanceSessionUpdateWithoutEmployeeInput, AttendanceSessionUncheckedUpdateWithoutEmployeeInput>
    create: XOR<AttendanceSessionCreateWithoutEmployeeInput, AttendanceSessionUncheckedCreateWithoutEmployeeInput>
  }

  export type AttendanceSessionUpdateWithWhereUniqueWithoutEmployeeInput = {
    where: AttendanceSessionWhereUniqueInput
    data: XOR<AttendanceSessionUpdateWithoutEmployeeInput, AttendanceSessionUncheckedUpdateWithoutEmployeeInput>
  }

  export type AttendanceSessionUpdateManyWithWhereWithoutEmployeeInput = {
    where: AttendanceSessionScalarWhereInput
    data: XOR<AttendanceSessionUpdateManyMutationInput, AttendanceSessionUncheckedUpdateManyWithoutEmployeeInput>
  }

  export type AttendanceSessionScalarWhereInput = {
    AND?: AttendanceSessionScalarWhereInput | AttendanceSessionScalarWhereInput[]
    OR?: AttendanceSessionScalarWhereInput[]
    NOT?: AttendanceSessionScalarWhereInput | AttendanceSessionScalarWhereInput[]
    id?: UuidFilter<"AttendanceSession"> | string
    employeeId?: UuidFilter<"AttendanceSession"> | string
    workDate?: DateTimeFilter<"AttendanceSession"> | Date | string
    clockInAt?: DateTimeFilter<"AttendanceSession"> | Date | string
    clockOutAt?: DateTimeNullableFilter<"AttendanceSession"> | Date | string | null
    clockInKey?: UuidFilter<"AttendanceSession"> | string
    clockOutKey?: UuidNullableFilter<"AttendanceSession"> | string | null
    closedBySystem?: BoolFilter<"AttendanceSession"> | boolean
  }

  export type ProfileChangeEventUpsertWithWhereUniqueWithoutEmployeeInput = {
    where: ProfileChangeEventWhereUniqueInput
    update: XOR<ProfileChangeEventUpdateWithoutEmployeeInput, ProfileChangeEventUncheckedUpdateWithoutEmployeeInput>
    create: XOR<ProfileChangeEventCreateWithoutEmployeeInput, ProfileChangeEventUncheckedCreateWithoutEmployeeInput>
  }

  export type ProfileChangeEventUpdateWithWhereUniqueWithoutEmployeeInput = {
    where: ProfileChangeEventWhereUniqueInput
    data: XOR<ProfileChangeEventUpdateWithoutEmployeeInput, ProfileChangeEventUncheckedUpdateWithoutEmployeeInput>
  }

  export type ProfileChangeEventUpdateManyWithWhereWithoutEmployeeInput = {
    where: ProfileChangeEventScalarWhereInput
    data: XOR<ProfileChangeEventUpdateManyMutationInput, ProfileChangeEventUncheckedUpdateManyWithoutEmployeeInput>
  }

  export type ProfileChangeEventScalarWhereInput = {
    AND?: ProfileChangeEventScalarWhereInput | ProfileChangeEventScalarWhereInput[]
    OR?: ProfileChangeEventScalarWhereInput[]
    NOT?: ProfileChangeEventScalarWhereInput | ProfileChangeEventScalarWhereInput[]
    id?: UuidFilter<"ProfileChangeEvent"> | string
    employeeId?: UuidFilter<"ProfileChangeEvent"> | string
    actorId?: UuidFilter<"ProfileChangeEvent"> | string
    actorRole?: EnumEmployeeRoleFilter<"ProfileChangeEvent"> | $Enums.EmployeeRole
    changedFields?: StringNullableListFilter<"ProfileChangeEvent">
    beforeValues?: JsonNullableFilter<"ProfileChangeEvent">
    afterValues?: JsonNullableFilter<"ProfileChangeEvent">
    occurredAt?: DateTimeFilter<"ProfileChangeEvent"> | Date | string
    publishedAt?: DateTimeNullableFilter<"ProfileChangeEvent"> | Date | string | null
  }

  export type EmployeeCreateWithoutAttendanceSessionsInput = {
    id?: string
    name: string
    email: string
    position: string
    phone: string
    photoObjectKey?: string | null
    status?: $Enums.EmployeeStatus
    role: $Enums.EmployeeRole
    passwordHash: string
    mustChangePassword?: boolean
    authProvider?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    profileChangeEvents?: ProfileChangeEventCreateNestedManyWithoutEmployeeInput
  }

  export type EmployeeUncheckedCreateWithoutAttendanceSessionsInput = {
    id?: string
    name: string
    email: string
    position: string
    phone: string
    photoObjectKey?: string | null
    status?: $Enums.EmployeeStatus
    role: $Enums.EmployeeRole
    passwordHash: string
    mustChangePassword?: boolean
    authProvider?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    profileChangeEvents?: ProfileChangeEventUncheckedCreateNestedManyWithoutEmployeeInput
  }

  export type EmployeeCreateOrConnectWithoutAttendanceSessionsInput = {
    where: EmployeeWhereUniqueInput
    create: XOR<EmployeeCreateWithoutAttendanceSessionsInput, EmployeeUncheckedCreateWithoutAttendanceSessionsInput>
  }

  export type EmployeeUpsertWithoutAttendanceSessionsInput = {
    update: XOR<EmployeeUpdateWithoutAttendanceSessionsInput, EmployeeUncheckedUpdateWithoutAttendanceSessionsInput>
    create: XOR<EmployeeCreateWithoutAttendanceSessionsInput, EmployeeUncheckedCreateWithoutAttendanceSessionsInput>
    where?: EmployeeWhereInput
  }

  export type EmployeeUpdateToOneWithWhereWithoutAttendanceSessionsInput = {
    where?: EmployeeWhereInput
    data: XOR<EmployeeUpdateWithoutAttendanceSessionsInput, EmployeeUncheckedUpdateWithoutAttendanceSessionsInput>
  }

  export type EmployeeUpdateWithoutAttendanceSessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    position?: StringFieldUpdateOperationsInput | string
    phone?: StringFieldUpdateOperationsInput | string
    photoObjectKey?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumEmployeeStatusFieldUpdateOperationsInput | $Enums.EmployeeStatus
    role?: EnumEmployeeRoleFieldUpdateOperationsInput | $Enums.EmployeeRole
    passwordHash?: StringFieldUpdateOperationsInput | string
    mustChangePassword?: BoolFieldUpdateOperationsInput | boolean
    authProvider?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    profileChangeEvents?: ProfileChangeEventUpdateManyWithoutEmployeeNestedInput
  }

  export type EmployeeUncheckedUpdateWithoutAttendanceSessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    position?: StringFieldUpdateOperationsInput | string
    phone?: StringFieldUpdateOperationsInput | string
    photoObjectKey?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumEmployeeStatusFieldUpdateOperationsInput | $Enums.EmployeeStatus
    role?: EnumEmployeeRoleFieldUpdateOperationsInput | $Enums.EmployeeRole
    passwordHash?: StringFieldUpdateOperationsInput | string
    mustChangePassword?: BoolFieldUpdateOperationsInput | boolean
    authProvider?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    profileChangeEvents?: ProfileChangeEventUncheckedUpdateManyWithoutEmployeeNestedInput
  }

  export type EmployeeCreateWithoutProfileChangeEventsInput = {
    id?: string
    name: string
    email: string
    position: string
    phone: string
    photoObjectKey?: string | null
    status?: $Enums.EmployeeStatus
    role: $Enums.EmployeeRole
    passwordHash: string
    mustChangePassword?: boolean
    authProvider?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    attendanceSessions?: AttendanceSessionCreateNestedManyWithoutEmployeeInput
  }

  export type EmployeeUncheckedCreateWithoutProfileChangeEventsInput = {
    id?: string
    name: string
    email: string
    position: string
    phone: string
    photoObjectKey?: string | null
    status?: $Enums.EmployeeStatus
    role: $Enums.EmployeeRole
    passwordHash: string
    mustChangePassword?: boolean
    authProvider?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    attendanceSessions?: AttendanceSessionUncheckedCreateNestedManyWithoutEmployeeInput
  }

  export type EmployeeCreateOrConnectWithoutProfileChangeEventsInput = {
    where: EmployeeWhereUniqueInput
    create: XOR<EmployeeCreateWithoutProfileChangeEventsInput, EmployeeUncheckedCreateWithoutProfileChangeEventsInput>
  }

  export type EmployeeUpsertWithoutProfileChangeEventsInput = {
    update: XOR<EmployeeUpdateWithoutProfileChangeEventsInput, EmployeeUncheckedUpdateWithoutProfileChangeEventsInput>
    create: XOR<EmployeeCreateWithoutProfileChangeEventsInput, EmployeeUncheckedCreateWithoutProfileChangeEventsInput>
    where?: EmployeeWhereInput
  }

  export type EmployeeUpdateToOneWithWhereWithoutProfileChangeEventsInput = {
    where?: EmployeeWhereInput
    data: XOR<EmployeeUpdateWithoutProfileChangeEventsInput, EmployeeUncheckedUpdateWithoutProfileChangeEventsInput>
  }

  export type EmployeeUpdateWithoutProfileChangeEventsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    position?: StringFieldUpdateOperationsInput | string
    phone?: StringFieldUpdateOperationsInput | string
    photoObjectKey?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumEmployeeStatusFieldUpdateOperationsInput | $Enums.EmployeeStatus
    role?: EnumEmployeeRoleFieldUpdateOperationsInput | $Enums.EmployeeRole
    passwordHash?: StringFieldUpdateOperationsInput | string
    mustChangePassword?: BoolFieldUpdateOperationsInput | boolean
    authProvider?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    attendanceSessions?: AttendanceSessionUpdateManyWithoutEmployeeNestedInput
  }

  export type EmployeeUncheckedUpdateWithoutProfileChangeEventsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    position?: StringFieldUpdateOperationsInput | string
    phone?: StringFieldUpdateOperationsInput | string
    photoObjectKey?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumEmployeeStatusFieldUpdateOperationsInput | $Enums.EmployeeStatus
    role?: EnumEmployeeRoleFieldUpdateOperationsInput | $Enums.EmployeeRole
    passwordHash?: StringFieldUpdateOperationsInput | string
    mustChangePassword?: BoolFieldUpdateOperationsInput | boolean
    authProvider?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    attendanceSessions?: AttendanceSessionUncheckedUpdateManyWithoutEmployeeNestedInput
  }

  export type AttendanceSessionCreateManyEmployeeInput = {
    id?: string
    workDate: Date | string
    clockInAt: Date | string
    clockOutAt?: Date | string | null
    clockInKey: string
    clockOutKey?: string | null
    closedBySystem?: boolean
  }

  export type ProfileChangeEventCreateManyEmployeeInput = {
    id?: string
    actorId: string
    actorRole: $Enums.EmployeeRole
    changedFields?: ProfileChangeEventCreatechangedFieldsInput | string[]
    beforeValues?: NullableJsonNullValueInput | InputJsonValue
    afterValues?: NullableJsonNullValueInput | InputJsonValue
    occurredAt?: Date | string
    publishedAt?: Date | string | null
  }

  export type AttendanceSessionUpdateWithoutEmployeeInput = {
    id?: StringFieldUpdateOperationsInput | string
    workDate?: DateTimeFieldUpdateOperationsInput | Date | string
    clockInAt?: DateTimeFieldUpdateOperationsInput | Date | string
    clockOutAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    clockInKey?: StringFieldUpdateOperationsInput | string
    clockOutKey?: NullableStringFieldUpdateOperationsInput | string | null
    closedBySystem?: BoolFieldUpdateOperationsInput | boolean
  }

  export type AttendanceSessionUncheckedUpdateWithoutEmployeeInput = {
    id?: StringFieldUpdateOperationsInput | string
    workDate?: DateTimeFieldUpdateOperationsInput | Date | string
    clockInAt?: DateTimeFieldUpdateOperationsInput | Date | string
    clockOutAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    clockInKey?: StringFieldUpdateOperationsInput | string
    clockOutKey?: NullableStringFieldUpdateOperationsInput | string | null
    closedBySystem?: BoolFieldUpdateOperationsInput | boolean
  }

  export type AttendanceSessionUncheckedUpdateManyWithoutEmployeeInput = {
    id?: StringFieldUpdateOperationsInput | string
    workDate?: DateTimeFieldUpdateOperationsInput | Date | string
    clockInAt?: DateTimeFieldUpdateOperationsInput | Date | string
    clockOutAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    clockInKey?: StringFieldUpdateOperationsInput | string
    clockOutKey?: NullableStringFieldUpdateOperationsInput | string | null
    closedBySystem?: BoolFieldUpdateOperationsInput | boolean
  }

  export type ProfileChangeEventUpdateWithoutEmployeeInput = {
    id?: StringFieldUpdateOperationsInput | string
    actorId?: StringFieldUpdateOperationsInput | string
    actorRole?: EnumEmployeeRoleFieldUpdateOperationsInput | $Enums.EmployeeRole
    changedFields?: ProfileChangeEventUpdatechangedFieldsInput | string[]
    beforeValues?: NullableJsonNullValueInput | InputJsonValue
    afterValues?: NullableJsonNullValueInput | InputJsonValue
    occurredAt?: DateTimeFieldUpdateOperationsInput | Date | string
    publishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type ProfileChangeEventUncheckedUpdateWithoutEmployeeInput = {
    id?: StringFieldUpdateOperationsInput | string
    actorId?: StringFieldUpdateOperationsInput | string
    actorRole?: EnumEmployeeRoleFieldUpdateOperationsInput | $Enums.EmployeeRole
    changedFields?: ProfileChangeEventUpdatechangedFieldsInput | string[]
    beforeValues?: NullableJsonNullValueInput | InputJsonValue
    afterValues?: NullableJsonNullValueInput | InputJsonValue
    occurredAt?: DateTimeFieldUpdateOperationsInput | Date | string
    publishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type ProfileChangeEventUncheckedUpdateManyWithoutEmployeeInput = {
    id?: StringFieldUpdateOperationsInput | string
    actorId?: StringFieldUpdateOperationsInput | string
    actorRole?: EnumEmployeeRoleFieldUpdateOperationsInput | $Enums.EmployeeRole
    changedFields?: ProfileChangeEventUpdatechangedFieldsInput | string[]
    beforeValues?: NullableJsonNullValueInput | InputJsonValue
    afterValues?: NullableJsonNullValueInput | InputJsonValue
    occurredAt?: DateTimeFieldUpdateOperationsInput | Date | string
    publishedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}