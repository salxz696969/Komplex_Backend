import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import routes from "./app/komplex/routes/index";
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use("/", routes);


app.listen(process.env.PORT, () => {
	console.log(`Server is running on http://localhost:${process.env.PORT}`);
});
