import postgres from "postgres";

export const sql = postgres(
    {
        host: "localhost",
        port: 5432,
        database: "postgres",
        user: "postgres",
        password: "admin",
    }
)

