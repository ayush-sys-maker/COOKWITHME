import pg from "pg";

const data = new pg.Pool({
    user: "postgres",
    host: "localhost",
    database: "COOKWITHME",
    password: "987654",
    port: 5432
});

export default data;
