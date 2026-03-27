import Card from "../Models/Card.js";


// save extracted data to db
export const saveCard = async (data)=>{
    try{
        const card = await Card.create(data);
        console.log("card Save",card.id);
        return card;
    }catch(err){
        console.log("saveCard error",err.mesaage);
        throw err;
    }
}

// Get all saved Cards
export const getAllCards = async(req,res)=>{
    try{
const cards=await Card.find().sort({createdAt: -1});
res.json({success:true,count:cards.length,cards});
    }catch(err){
res.status(500).json({success:false,error:err.message});
    }
}