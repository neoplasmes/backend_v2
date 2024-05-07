const express = require("express");
const cors = require("cors");
const cookieparser = require("cookie-parser");

//считывает переменные из .env файла
require("dotenv").config();

const PORT = process.env.PORT || 3500;

const server = express();

//middleware, который автоматически устанавливает вот этот заголовок который я не зна зачем нужен
server.use((req, res, next) => {
    res.header("Access-Control-Allow-Credentials", "true");
    next();
});

//конфигурация cors, чтобы сервер пускал нас (мы указаны в origin), а также чтобы разрешил исползовать cookie (credentials: true)
server.use(cors(
    {
        origin: 'http://localhost:3000',
        credentials: true,
        optionsSuccessStatus: 200
    }
));

//встроенный в express middleware, который позволяет нормально считывать куки и JSON объекты из тел запросов
server.use(express.urlencoded({extended: false}));
server.use(express.json());
server.use(cookieparser());

//путь для медиафайлов
server.use("/media", express.static("media"));

server.get("/logout", require("./routes/logout"));
server.get("/refresh", require("./routes/refresh"));
server.get("/courses", require("./middleware/verifyJWT").verifyJWTWeak, require("./routes/courses"));
server.get("/courses/:media_path", require("./middleware/verifyJWT").verifyJWTMedium, require("./routes/chapters"));

server.post("/login", require("./routes/login"));
server.post("/registration", require("./routes/registration"));
server.post("/examination", require("./middleware/verifyJWT").verifyJWTStrong, require("./routes/examination"));

//функция, которая запускает сервер
server.listen(PORT, () => {
    console.log(`server has been started on port ${PORT}`);
});