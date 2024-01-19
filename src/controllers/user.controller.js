import { asyncHandler } from "../../utils/asyncHandler.js";
import {ApiError} from "../../utils/ApiError.js"
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../../utils/cloudinary.js"
import { ApiResponse } from "../../utils/ApiResponse.js"

const generateAccessAndRefreshToken = async(userId)=>{
    try{
        const user = await User.findById(userId)
        const aceesToekn = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        //refereshToken save in db
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave : false})

        return { aceesToekn, refreshToken }

    }catch(err){
        throw new ApiError(500, "Something went wrong while generating access and refresh token !")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    
    //get user details from frontend
    //validation of user details-not empty
    //check if already exists: username & email
    //check for images, check for avatar
    //upload them to cloudinary, avatar
    //create user object-create entry in db
    //remove password & refress token from response
    //check for user creation
    //return response

    const {userName, email, fullName, password} = req.body
    // console.log("email", email);
    if([fullName, email, userName, password].some((filed)=>
        filed?.trim === ""
    )){
        throw new ApiError(400, "All fileds are required");
    }

    const existedUser = User.findOne({
        $or: [{ userName }, { email }]
    })
    if(existedUser){
        throw new ApiError(409, "User with email already exists.")
    }

    const avatarLocalPath = req.files?.avatar[0].path
    const coverIageLocalPath = req.files?.coverImage[0].path
    if(!avatarLocalPath){
        throw new ApiError(404, "Avatar file is required.")
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath)
    const coverImage=await uploadOnCloudinary(coverIageLocalPath)

    if(!avatar){
        throw new ApiError(404, "Avatar file is required.")
    }

   const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        userName: userName.toLowerCase()
    })

    const createdUser = await User.fineById(user._id).select(
        "-password -refressToken"
    )

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user.")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully.!")
    )
});


const loginUser = asyncHandler(async ( req, res )=>{
    //req.body->data
    //username or email
    //find thr user
    //password check
    //generate access & refresh token 
    //send cookies
    const { username, email } = req.body
    if( !username && !email ){
        throw ApiError(400, "username or password is required!")
    }
    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, "User doesn't exist!")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if( !isPasswordValid ){
        throw ApiError(401, "password is invalid!")
    }

    const { aceesToekn, refreshToken } = generateAccessAndRefreshToken(user._id)

    //we can call db for logInuser or we can update in user also
    const logedInuser = await User.findById(user._id)
    .select("-password -refreshToken")

    //for sending cookies => a object, named "option have to design"
    const option = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", aceesToekn, option)
    .cookie("refreshToken", refreshToken, option)
    .json(
        new ApiResponse(
            200,
            {
                user: logedInuser, aceesToekn, refreshToken
            },
            "User loged in successfully"
        )
    )

});

const logoutUser = asyncHandler (async (req, res) => {
    //reset refreshToken 
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    //clear cookies
    const option = {
        httpOnly: true,
        secure: true
    }
    return res
    .status(200)
    .clearCookie("accessToken", option)
    .clearCookie("refreshToken", option)
    .json(
        new ApiResponse(
            200,
            {},
            "User loged out successfully"

        )
    )
});

export { registerUser, loginUser, logoutUser };
