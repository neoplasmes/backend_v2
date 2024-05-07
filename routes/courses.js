const database = require("../database/database");


const sendCoursesData = async (request, response) => {
    //Проверка на аутентификацию
    const user_id = request.body.user_id
    
    //database.pool.query(`SELECT * FROM personalized_courses_data(${user_id})`)
    if (user_id) {
        database.pool.query(`SELECT * FROM personalized_courses_data(${user_id});`)
        .then((result) => {
            return response.status(200).json(result.rows);
        })
        .catch((error) => {
            console.log(error);
            return response.sendStatus(500);
        })
    } else {
        const data = await database.simpleSelect("courses");
        if (data.error) return response.sendStatus(500);
        
        return response.status(200).json(data.data);
    }
}

module.exports = sendCoursesData;