import express from "express";
import dotenv from "dotenv";
dotenv.config();
const app = express();
app.use(express.json());

console.log(process.env.DATABASE_URL);

app.listen(process.env.PORT, () => {
	console.log(`Server is running on http://localhost:${process.env.PORT}`);
});
