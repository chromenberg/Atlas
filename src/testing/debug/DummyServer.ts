// Provides a webpage to interface with ATLAS without needing to setup Lagrange and Wyvern
// Useful for debugging or making a very rudimentary version of wyvern that is API only
import express from "express";
import { Atlas } from "../../lib/AtlasManager.js";
import { Logger, LogLevel } from "../../../../Common/Logging/dist/Logger.js";
const server = express()
// const a = new Atlas()
server.listen(8080)
/*
This endpoint requires one of the following:
The user is a bot
The user shares a mutual guild with the current user
The user is a friend of the current user
The user is a friend suggestion of the current user
The user has an outgoing friend request to the current user
A valid join_request_id is provided
*/
server.get("/api/v1/users/:user_id/profile", async (req, res) => {
    // const user = (await a.client.users.getUserByID(req.params.user_id)).rows
    res.setHeader("Content-Type", "application/json");
    res.send({
        ROUTE_NAME: req.url,
        ROUTE_PARAMS: req.params,
        // RESPONSE: user
    });
    res.end()
    Logger.sendLog(
        LogLevel.Info,
        ["ATLAS", "DummyServer", req.url],
        "Retrieved info for user id ("+req.params.user_id+")\n",
        // user
    )
})
