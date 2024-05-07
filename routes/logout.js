const database = require("../database/database");
require("dotenv").config();

const handleLogout = async (request, response) => {
    //успешный статус - 204
    const cookies = request.cookies;
    if (!cookies?.jwt) return response.sendStatus(204); //No content - типо всё очищено уже

    //проверка на соответствие REFRESH_TOKEN_SECRET и валидность его payload
    const refreshToken = cookies.jwt;
    let decodedPayload;
    try{
        decodedPayload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        //при декодинге не найдены соответствующие поля - значит токен невалидный, значит bad request
        if(!(decodedPayload && decodedPayload.user_id)) return response.sendStatus(404);
    } catch (error){
        //проверка на истечение токена
        return response.sendStatus(204);
    }

    //проверка на наличие пользователя в базе данных
    const userResponse = await database.simpleSelect("users",{
        columns: ["user_id"],
        where: {user_id: decodedPayload.user_id}
    });
    if(userResponse.error || userResponse.dataLength !== 1) return response.sendStatus(404);//bad request

    //извлекаем данные
    const userData = userResponse.data[0];
    //при прохождении всех проверок
    const deleteResponse = await database.updateJWT(userData.user_id, "NULL");
    if (deleteResponse.error) return response.sendStatus(500);//Internal server error
    
    //здесь должно полностью совпадать с выданным куки в /login
    response.clearCookie('jwt', { 
        httpOnly: true,
        sameSite: "none",
        secure: true,
        maxAge: 12 * 60 * 60 * 1000
    });
    response.sendStatus(204);
}

module.exports = handleLogout;