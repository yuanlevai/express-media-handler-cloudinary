require('dotenv').config()
const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

const path = require('path');

const port = process.env.APP_PORT;
const UPLOAD_DIR = path.join(__dirname, process.env.UPLOAD_DIR);

// init cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

// function upload ke cloud
async function cloudinaryUpload(filePath, folder) {
    if (typeof folder != "string" ) {
        folder = 'images'
    } 
    if (folder === " ") {
        folder = 'images'
    }
    let result
    try {
        result = await cloudinary.uploader.upload(filePath, {
            use_filename: true,
            folder: folder
        })
    } catch (error) {
        console.error(error)
        return ""
    }

    fs.unlinkSync(filePath)

    return result.url
}


// inisiasi multer storage
const storage = multer.diskStorage({
    // handler
    destination: (req, file, callback) => {
        callback(null, UPLOAD_DIR);
    },
    // mengambil name 
    filename: (req, file, callback) => {
        const uniqueSuffix = new Date().getTime()
        callback(null, `${file.fieldname}-${uniqueSuffix}-${file.originalname}`); 
    }
})

// inisiasi midlleware express
const upload = multer({
    storage: storage,
    // filter
    fileFilter: (req, file, callback) => {
        if(file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg' || file.mimetype === 'image/svg') {
            return callback(null, true)
        } else {
            callback(null, false)
            return callback(new Error("unsupported file type"))
        }
    }
})

const app = express();

// function untuk upload single file
async function uploadHandler (req, res) {
    let url = await cloudinaryUpload(req.file.path, req.params.folder)
    res.status(200).json({
        code: "200",
        status: "OK",
        url : url
    })
}

// afunction untuk upload multiple files
async function multipleUploadHandler (req, res) {
    let urls = [];
    for (let i = 0; i < req.files.length; i++) {
        urls.push(await cloudinaryUpload(req.files[i].path))
    }
    res.status(200).json({
        code: "200",
        status: "OK",
        url: urls
    })
}

// single uploads
app.post('/image/upload/:folder', upload.single('image'), uploadHandler)

// multiple
app.post('/image/uploads/', upload.array('image', 10), multipleUploadHandler)

// serving file static local
app.get('/uploads/:filename', (req, res) => {
    res.sendFile(path.join(UPLOAD_DIR, req.params.filename))
})

app.use((err, req, res, next) => {
    res.status(400).json({
        code: "400",
        status: "Bad Request",
        message: err.message
    })
})

app.listen(port);