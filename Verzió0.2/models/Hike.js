import mongoose from "mongoose";

const HikeSchema = new mongoose.Schema({
    hikeName: String,
    startLocation: String,
    endLocation: String,
    stops: [String]
});

export default mongoose.model("Hike", HikeSchema);
