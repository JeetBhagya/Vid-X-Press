import { v2 as cloudinary } from "cloudinary";
import fs from 'fs'

          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary=async (localFilPath)=>{
    try{
        if(!localFilPath) return null
        //upload the file on cloudinary
        const response=cloudinary.uploader.upload(localFilPath, {
            resource_type: "auto"
        })
        //file has been sucessfully uploaded
        console.log("file uploaded on cloudinary: ", response);
        return response;

    }catch{
        fs.unlinkSync(localFilPath) //remove the locally saved temporary file as the upload operation got failed.
        return null; 
    }
}


// cloudinary.uploader.upload("https://upload.wikimedia.org/wikipedia/commons/a/ae/Olympic_flag.jpg",
//   { public_id: "olympic_flag" }, 
//   function(error, result) {console.log(result); });

export {uploadOnCloudinary}