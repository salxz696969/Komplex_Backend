import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import route from "./app/routes/index";
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use("/", route);


app.listen(process.env.PORT, () => {
	console.log(`Server is running on http://localhost:${process.env.PORT}`);
});
