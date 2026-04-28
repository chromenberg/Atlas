import { readFile } from "node:fs/promises";
import "./wasm_exec.js";

export async function LoadGoWASM(path: string) {
    // @ts-ignore
    const go = new global.Go();
    const buffer = await readFile(path);
    const {instance} = await WebAssembly.instantiate(buffer, go.importObject);
    go.run(instance);
    return instance
}

