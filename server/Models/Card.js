
import mongoose from "mongoose";

const cardSchema = new mongoose.Schema(
{

// Extracted Details 
name: { type:String, default: "" },
designation: { type:String, default: "" },
company: { type:String, default: "" },
email: { type:String, default: "" },
phone: { type:String, default: "" },
mobile: { type:String, default: "" },
website: { type:String, default: "" },
address: { type:String, default: "" },
city: { type:String, default: "" },
state: { type:String, default: "" },
country: {type:String, default: "" },
linkedin: {type:String, default: "" },
twitter: { type:String, default: "" },
instagram: { type:String, default: "" },
whatsapp: { type:String, default: "" },
},

{timestamps:true} // createdAt/ UpdatedAt
)

export default mongoose.model("Card",cardSchema);