import { createSocket } from "dgram";
import { Sockets } from "./Routes.js";
import { Logger, LogLevel } from "../../../../../Logging/dist/Logger.js";
export function connectAtlas() {
    const sock = createSocket({
        type: "udp4",
    });
    sock.bind();

    sock.on("message", (msg) => {
        Logger.sendLog(LogLevel.Verbose, ["ATLAS", "Socketing", "Lagrange-Atlas"], msg.toJSON())
    })
}


