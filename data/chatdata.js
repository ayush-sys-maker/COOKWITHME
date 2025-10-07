import data from "./data.js";


const chatdata = {

async getchats(user_id){
    try {
        const result = await data.query('SELECT * FROM chathistory where user_id = $1 ORDER BY created_at ASC '  , [user_id]);
        return result.rows;
        
    } catch (error) {
        console.error('Error fetching chats:', error);
        throw error;
    }   
    
},



async addchat(user_id, question,answer,conversation_id){
    try {
        const result = await data.query('INSERT INTO chathistory (user_id,question,answer,conversation_id) VALUES ($1,$2,$3,$4) RETURNING *'  , [user_id,question,answer,conversation_id]);
        console.log('chat added successfully:',result.rows[0]);
        return result.rows;
        
    } catch (error) {
        console.error('Error adding chat:', error);
        throw error;
    }   
    
}



}


export default chatdata