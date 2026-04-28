import { readFile } from "node:fs/promises";
import { WASI } from "node:wasi";
import "./wasm_exec.js";
// @ts-ignore
const go = new global.Go();

export async function LoadGoWASM(path: string) {
    const buffer = await readFile(path);
    const {instance} = await WebAssembly.instantiate(buffer, go.importObject);
    go.run(instance);
    return instance
}

