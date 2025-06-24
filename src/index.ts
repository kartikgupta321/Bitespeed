import express from 'express';
import dotenv from 'dotenv';
import identifyRoute from './routes/identify';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './swagger.json';

dotenv.config();
const app = express();
app.use(express.json());

app.use('/identify', identifyRoute);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const PORT = process.env.PORT || 3000;
console.log(PORT);
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
