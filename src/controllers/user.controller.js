import { asyncHandler } from "../../utils/asyncHandler.js";
import {ApiError} from "../../utils/ApiError.js"
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../../utils/cloudinary.js"
import { ApiResponse } from "../../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

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


const refreshAcessToken = asyncHandler( async (req, res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if (!incomingRefreshToken) {
       throw new ApiError(401, "Un-authorized request !") 
    }
    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token !") 
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used !") 
        }
    
        const option = {
            httpOnly: true,
            secure: true
        }
        const {accessToekn, newRefreshToken} = await generateAccessAndRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToekn, option)
        .cookie("refreshToken", newRefreshToken, option)
        .json(
            new ApiResponse(
                200,
                {accessToekn, refreshToken: newRefreshToken},
                "Access token refreshed !"
            )
        )
    } catch (error) {
        throw new ApiError(401, "Invalid refresh token !")
    }

})

const chnageCurrentPassword = asyncHandler( async (req, res) => {
    const {oldPassword, newPassword} = req.body;
    const user = await User.findById(req.body?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password !")
    }
    user.password = newPassword
    await user.save({ validateBeforeSave: false})


    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully !"))

})

const getCurrectUser = asyncHandler (async (req, res) =>{
    return res
    .status(200)
    .json(200, req.user, "Corrent user fetch successfully")
})

const updateAcoutDetails = asyncHandler ( async (req, res) => {
    const {fullName, email} = req.body
    if(!fullName || !email){
        throw new ApiError(200, "All fileds are required !")
    }

    const user = User.findByIdAndUpdate(
        req.body?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully !"))
})

const updateUserAvatar = asyncHandler (async (req, res)=>{
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing !")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading avatar !")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }).select("-password")

        return res
        .status(200)
        .json(ApiResponse(
            200,
            user,
            "Avatar updated successfully !"
        ))
})

const updateUserCoverImage = asyncHandler (async (req, res)=>{
    const coverIageLocalPath = req.file?.path
    if (!coverIageLocalPath) {
        throw new ApiError(400, "Avatar file is missing !")
    }

    const coverImage = await uploadOnCloudinary(coverIageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading cover image !")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: avatar.url
            }
        },
        {
            new: true
        }).select("-password")

        return res
        .status(200)
        .json(ApiResponse(
            200,
            user,
            "Cover image updated successfully !"
        ))
})

export { 
    registerUser, 
    loginUser, 
    logoutUser,
    refreshAcessToken,
    chnageCurrentPassword,
    getCurrectUser,
    updateAcoutDetails,
    updateUserAvatar,
    updateUserCoverImage
};
