import { createServer, Socket } from "net";
import { Logger, LogLevel } from "../../../../../Common/Logging/dist/Logger.js";
import { unlinkSync } from "fs";
import type { Atlas } from "../../AtlasManager.js";

// Temporarily inject atlas into here for the time being
export function connectAtlas(atlasInstance: Atlas) {
    const sock = createServer();
    sock.listen("/tmp/WyvernSockets/Atlas", () => {
        console.log("Connected");
    })
    

    process.on("beforeExit", (code) => {
        Logger.sendLog(LogLevel.Info, ["Process", "BeforeExit", "ATLAS"], "Disconnecting ATLAS Socket");
        unlinkSync("/tmp/WyvernSockets/Atlas");
    })
    const connections = new Set<Socket>()
    sock.on("connection", (socket) => {
        connections.add(socket);
        
        Logger.sendLog(LogLevel.Info, ["ATLAS", "Socketing"], "A Lagrange Instance has connected to ATLAS")

        socket.on("data", async (msg) => {
    
            msg = JSON.parse(msg as string);
            Logger.sendLog(LogLevel.Verbose, ["ATLAS", "Socketing", "Lagrange-Atlas"], "New message from lagrange:",msg);
            // @ts-ignore
            if (msg.type === 0) {
                socket.write(JSON.stringify(
                    // @ts-ignore
                    (await atlasInstance.client.users.getUserByID(msg.data.user_id)).rows
                ))
            }
        })
        
        socket.on("close", () => {
            connections.delete(socket);
        })
    })
}

