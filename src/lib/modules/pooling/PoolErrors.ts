// --- POOLING TYPES ---
export enum PoolErrorCodes {
    PoolUnexpectedError = 100,
    PoolUnexpectedResourceShutdown,
    PoolUnexpectedStateTransition,
    PoolFailedResourceInit,
    PoolFailedInit,
    PoolFailedResourceReboot,
    PoolDispatchedResourceInPrepare,
    PoolDispatchedResourceInActive,
    PoolNoResourcesOnStandby
}

export interface PoolError {
    message: string
    code: PoolErrorCodes
}

export const PoolError = {
    POOL_FAILED_RESOURCE_INIT: {
        message: "$1 failed to initialize $0. State was either incorrect or callback was already set",
        code: PoolErrorCodes.PoolFailedResourceInit
    },
    POOL_FAILED_INIT: {
        message: "$0 failed to initialize correctly. Aborting...",
        code: PoolErrorCodes.PoolFailedInit
    },
    POOL_UNEXPECTED_RESOURCE_SHUTDOWN: {
        message: "$0 was shutdown without being signalled. $1 attempting to restart $0",
        code: PoolErrorCodes.PoolUnexpectedResourceShutdown
    },
    POOL_FAILED_RESOURCE_REBOOT: {
        message: "$0 failed to be restarted, disconnecting from $1...",
        code: PoolErrorCodes.PoolFailedResourceReboot,
    },
    POOL_UNEXPECTED_STATE_TRANSITION: {
        message: "An unexpected state transition occurred in $0. Requesting $0 to return to $1 for state reset",
        code: PoolErrorCodes.PoolUnexpectedStateTransition
    },
    POOL_UNEXPECTED_ERROR: {
        message: "An unexpected error occurred within $0 or one of its resources",
        code: PoolErrorCodes.PoolUnexpectedError
    },
    POOL_DISPATCHED_ACTIVE_RESOURCE: {
        message: "$1 authorized a request to use $0 while $0 was already in use",
        code: PoolErrorCodes.PoolDispatchedResourceInActive
    },
    POOL_DISPATCHED_UNREADY_RESOURCE: {
        message: "$1 authorized a request to use $0 while $0 was initializing and has no callback",
        code: PoolErrorCodes.PoolDispatchedResourceInPrepare
    },
    POOL_NO_RESOURCES_ON_STANDBY: {
        message: "$1 couldnt find any resources in the pool on standby. Adding request to $1's queue",
        code: PoolErrorCodes.PoolNoResourcesOnStandby
    }
}