import { Logger, LogLevel } from "../../../Logging/dist/Logger.js";
import { AtlasClient } from "./AtlasClient.js";

export class Atlas {
    private _client: AtlasClient;
    constructor() {
        Logger.sendLog(LogLevel.Info, ["ATLAS"], "INITIALIZING ATLAS");
        this._client = new AtlasClient();
        this._client.onPoolReady(()=>{this.init()})
    }

    public get client(): AtlasClient {
        return this._client;
    }

    private async init(): Promise<void> {
        const pair = this._client.pool.requestForResource();
        if (!pair) return;
        const resource = pair.resource;
        let failureCount: number = 0;

        // User table
        try {
            Logger.sendLog(LogLevel.Info, ["ATLAS", "init()"], "Setting up users table");
            await this._client.execute(resource, `
                CREATE TABLE IF NOT EXISTS users (
                    user_id text,
                    username text,
                    display_name text,
                    created_at timestamp,
                    PRIMARY KEY (user_id)
                );
            `)
        } catch (e) {
            Logger.sendLog(LogLevel.Error, ["ATLAS", "init()"], "ATLAS failed to initialize the user table\n", e, "\n");
            failureCount += 1;
        }

        // guilds table
        try {
            Logger.sendLog(LogLevel.Info, ["ATLAS", "init()"], "Setting up guilds table");
            await this._client.execute(resource, `
                CREATE TABLE IF NOT EXISTS guilds (
                    guild_id text,
                    guild_name text,
                    guild_owner text,
                    PRIMARY KEY (guild_id)
                );
            `)
        } catch (e) {
            Logger.sendLog(LogLevel.Error, ["ATLAS", "init()"], "ATLAS failed to initialize the guild table\n", e, "\n");
            failureCount += 1;
        }
        // credentials
        try {
            Logger.sendLog(LogLevel.Info, ["ATLAS", "init()"], "Setting up credentials table");
            await this._client.execute(resource, `
                CREATE TABLE IF NOT EXISTS credentials (
                    user_id text,
                    authkey text,
                    pass text,
                    email text,
                    PRIMARY KEY (user_id)
                );
            `)
        } catch (e) {
            Logger.sendLog(LogLevel.Error, ["ATLAS", "init()"], "ATLAS failed to initialize the credentials table\n", e, "\n");
            failureCount += 1;
        }
        
        // channels table
        try {
            Logger.sendLog(LogLevel.Info, ["ATLAS", "init()"], "Setting up channels table");
            await this._client.execute(resource, `
                CREATE TABLE IF NOT EXISTS channels (
                    channel_id text,
                    guild_id text,
                    channel_name text,
                    PRIMARY KEY (channel_id, guild_id)
                );
            `)
        } catch (e) {
            Logger.sendLog(LogLevel.Error, ["ATLAS", "init()"], "ATLAS failed to initialize the channel table\n", e, "\n");
            failureCount += 1;
        }

        try {
            Logger.sendLog(LogLevel.Info, ["ATLAS", "init()"], "Setting up messages table");
            await this._client.execute(resource, `
                CREATE TABLE IF NOT EXISTS messages (
                    channel_id bigint,
                    message_id bigint,
                    author_id bigint,
                    content text,
                    PRIMARY KEY (channel_id, message_id)
                );
            `)
        } catch (e) {
            Logger.sendLog(LogLevel.Error, ["ATLAS", "init()"], "ATLAS failed to initialize the message table\n", e, "\n");
            failureCount += 1;
        }

        if (failureCount > 0) {
            Logger.sendLog(LogLevel.Critical, ["ATLAS", "init()"], "ATLAS encountered a fatal error during initialization and will shut down");
            throw new Error();
        }

        await Logger.sendLog(LogLevel.Success, ["ATLAS", "init()"], "ATLAS tables successfully initialized");

        this._client.getUsers();
        this._client.pool.returnResource(pair);
        console.log(await this._client.execute("DESCRIBE tables;"));

    }

}