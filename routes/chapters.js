const database = require("../database/database");

const sendChaptersData = async (request, response) => {
    const user_id = request.body.user_id;
    const media_path = request.params.media_path;

    database.pool.query(`SELECT * FROM personalized_chapters_data(${user_id}, '${media_path}')`)
    .then((result) => {
        return response.status(200).json(result.rows);
    })
    .catch((error) => {
        console.log(error);
        return response.status(500);
    });
}

module.exports = sendChaptersData;