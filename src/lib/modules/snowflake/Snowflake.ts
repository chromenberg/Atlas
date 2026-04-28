import { LoadGoWASM } from "../wasm/GoWASM.js"

await LoadGoWASM("./dist/lib/modules/snowflake/Snowflake.wasm");

export interface SnowflakeOptions {
    workerID: number,
    workerBits: number,
    sequenceBits: number,
    startEpoch: number
}

interface Snowflake {
    toString(): string
    toBase64(): string
    toBinary(): string
}

interface SnowflakeNode {
    GenerateID(): Snowflake
}

export function SnowflakeNode(args: SnowflakeOptions): SnowflakeNode {
    // @ts-ignore - This is a valid function that is pushed into global with glue code
    return SnowflakeGenerator(args.workerID, args.workerBits, args.sequenceBits, args.startEpoch);
};

export function test() {
    if (process.argv[2] !== "-test") return

}