import type { types } from "cassandra-driver";
import type { AtlasClient } from "../AtlasClient.js";

export class UserTableManager {
    constructor(private readonly parent: AtlasClient) {}
    public getUserByID(id: string): Promise<types.ResultSet> {
        return this.parent.execute("SELECT * FROM users WHERE user_id = "+id);
    }
}
