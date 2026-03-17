import express from "express";
import cors from "cors";

import { UserDetails, GetUserDetails } from "./services/userDetails.js";

const api = express();

// ✅ VERY IMPORTANT
api.use(express.text());
api.use(express.json());

api.use(cors());

api.post("/userDetails1", UserDetails);
api.get("/getUserDetails1", GetUserDetails);

export default api;