import { createServer } from "net";
import { Logger, LogLevel } from "../../../../../Common/Logging/dist/Logger.js";
import { unlinkSync } from "fs";

export function connectAtlas() {
    const sock = createServer();
    sock.listen("/tmp/WyvernSockets/Atlas", () => {
        console.log("Connected");
    })
    sock.on("message", (msg) => {
        Logger.sendLog(LogLevel.Verbose, ["ATLAS", "Socketing", "Lagrange-Atlas"], msg.toJSON());
    })

    process.on("beforeExit", (code) => {
        Logger.sendLog(LogLevel.Info, ["Process", "BeforeExit", "ATLAS"], "Disconnecting ATLAS Socket");
        unlinkSync("/tmp/WyvernSockets/Atlas");
    })
}

