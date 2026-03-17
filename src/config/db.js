import mysql from "mysql2/promise";

export const db = await mysql.createPool({
  host: "localhost",
  user: "root",
  password: "Root@123",
  database: "engageall",
  connectionLimit: 10
});