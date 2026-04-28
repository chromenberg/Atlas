import { Atlas } from "./lib/AtlasManager.js";
import "./lib/modules/snowflake/Snowflake.js";
// @ts-ignore
console.log(SnowflakeGenerator(1,10,12,8597346).GenerateID().toString())
// KEYSPACE HAS BEEN CREATED "ATLAS"
// AtlasClient.init()
