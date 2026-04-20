export enum CQLOpType { // operation type enum for what a cql operation will carry out
    DELETE,
    CREATE,
    LIST,
    UPDATE
}

export enum CQLObjType { // object types for cql
    TABLE,
    KEYSPACE,
}

export type ConcatenatedQuery = string; // alias for a string because this makes it a little clearer what it is