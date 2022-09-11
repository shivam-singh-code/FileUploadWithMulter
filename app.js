const express = require('express');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
const ObjectId = require('mongodb').ObjectId;
const app = express();
const port = 5000;

// middleWares
app.use(express.json());
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));


// MongoConnection
const mongoURI = `mongodb+srv://shivam:shivamsingh97166@nodeexpressproject.ifcex.mongodb.net/File-upload?retryWrites=true&w=majority`


// Mongo connection 
const connection = mongoose.createConnection(mongoURI);

// Initilize gridfs
let gfs, gridfsBucket;
connection.once('open', () => {

    gridfsBucket = new mongoose.mongo.GridFSBucket(connection.db, {
        bucketName: 'uploads'
    })
    // INitlize streams
    gfs = Grid(connection.db, mongoose.mongo);
    gfs.collection('uploads');
})

// create storage
const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) {
                    return reject(err);
                }
                const filename = buf.toString('hex') + path.extname(file.originalname);
                const fileInfo = {
                    filename: filename,
                    bucketName: 'uploads'
                };
                resolve(fileInfo);
            });
        });
    }
});
const upload = multer({ storage }).single('file');


// Routes

//GET 
app.get('/', (req, res) => {
    // res.render('index');
    gfs.files.find().toArray((err, files) => {
        if (!files || files.length === 0) {
            res.render('index', { files: false });
        } else {
            files.map(file => {
                if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
                    file.isImage = true;
                } else {
                    file.isImage = false;
                }
            })
            res.render('index', { files: files });
        }

        // return res.json(files);
    })
})

//POST --> Uploads Files
app.post('/uploads', upload, (req, res) => {
    res.redirect('/');
    // res.json({ file: req.file });
})


// GET --> reterive ALL files  
app.get('/files', (req, res) => {
    gfs.files.find().toArray((err, files) => {
        if (!files || files.length === 0) {
            return res.status(404).json({
                err: "NO SUCH FILE EXISTS"
            })
        }

        return res.json(files);
    })
})

// GET --> reterive single file form file name
app.get('/files/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        if (!file || file.length === 0) {
            return res.status(404).json({
                err: "NO SUCH FILE EXISTS"
            })
        }

        return res.json(file);
    })
})


// GET --> GET IMAGE AND DISPLAY IMAGE 
app.get('/image/:filename', async (req, res) => {
    try {
        await gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
            if (!file || file.length === 0) {
                return res.status(404).json({
                    err: "NO SUCH FILE EXISTS"
                })
            }

            // Check if file is image
            if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
                // Read output or stream to browser
                const readStream = gridfsBucket.openDownloadStreamByName(file.filename);
                readStream.pipe(res);
            } else {
                return res.status(404).json({
                    err: "file is not a image"
                })
            }
        })
    } catch (error) {
        console.log(error);
    }
})



// DELETE -> Delete uploaded files
app.delete('/files/:id', (req, res) => {
    console.log(req.params.id);
    // gfs.remove({ _id: req.params.id }, (err, gridStore) => {
    //     if (err) {
    //         return res.status(404).json({ err: err });
    //     }
    //     res.redirect('/');
    // })
    // gridfsBucket.delete(ObjectId(req.params._id));
    gridfsBucket.delete(ObjectId(req.params.id));
    res.redirect('/');
})

app.listen(port, () => {
    console.log(`App is Running on port ${port}`);
})
