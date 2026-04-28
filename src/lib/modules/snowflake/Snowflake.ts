import { LoadGoWASM } from "../wasm/GoWASM.js"

await LoadGoWASM("./dist/lib/modules/snowflake/Snowflake.wasm");
export function Snowflake() {
    
};

export declare function SnowflakeGenerator(
    workerID: number,
    workerBits: number,
    sequenceBits: number,
    startEpoch: number
): {
    GenerateID(): Snowflake
}

interface Snowflake {
    toString(): string
    toBase64(): string
    toBinary(): string
}


export function test() {
    if (process.argv[2] !== "-test") return

}