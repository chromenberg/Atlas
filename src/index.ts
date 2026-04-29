import { Atlas } from "./lib/AtlasManager.js";
import "./lib/modules/snowflake/Snowflake.js";
import { SnowflakeNode } from "./lib/modules/snowflake/Snowflake.js";
import { connectAtlas } from "./lib/modules/socketing/Socket.js";
import "./testing/debug/DummyServer.js"
// @ts-ignore
console.log(SnowflakeNode({
    workerID: 1,
    workerBits: 10,
    sequenceBits: 12,
    startEpoch: 8597346
}).GenerateID().toString())
connectAtlas()
// KEYSPACE HAS BEEN CREATED "ATLAS"
// AtlasClient.init()
